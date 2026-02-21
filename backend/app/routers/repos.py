from fastapi import APIRouter, BackgroundTasks, HTTPException
from app.schemas.repos import AnalyzeRepoRequest, RepoResponse, AnalysisRunResponse
from app.schemas.features import FeatureGraphResponse
from app.db import get_supabase

router = APIRouter(prefix="/api/repos", tags=["repos"])


@router.post("/analyze", response_model=RepoResponse)
async def analyze_repo(body: AnalyzeRepoRequest, background_tasks: BackgroundTasks):
    """Start asynchronous repo analysis."""
    db = get_supabase()

    # Insert repo record with 'pending' status
    result = (
        db.table("repos")
        .insert(
            {
                "github_url": body.github_url,
                "name": body.github_url.rstrip("/").split("/")[-1],
                "status": "pending",
            }
        )
        .execute()
    )
    repo = result.data[0]

    # Kick off background analysis
    from app.workers.analysis_worker import run_analysis

    background_tasks.add_task(run_analysis, repo["id"])

    return repo


@router.get("/{repo_id}", response_model=RepoResponse)
async def get_repo(repo_id: str):
    """Get repo details and status."""
    db = get_supabase()
    result = db.table("repos").select("*").eq("id", repo_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Repo not found")
    return result.data[0]


@router.get("/{repo_id}/features", response_model=FeatureGraphResponse)
async def get_features(repo_id: str):
    """Get full feature graph (nodes + edges) for a repo."""
    db = get_supabase()

    # Get the latest analysis run for this repo
    run_result = (
        db.table("analysis_runs")
        .select("id")
        .eq("repo_id", repo_id)
        .eq("status", "completed")
        .order("completed_at", desc=True)
        .limit(1)
        .execute()
    )
    if not run_result.data:
        raise HTTPException(status_code=404, detail="No completed analysis found")

    run_id = run_result.data[0]["id"]

    nodes_result = (
        db.table("feature_nodes")
        .select("*")
        .eq("analysis_run_id", run_id)
        .execute()
    )
    edges_result = (
        db.table("feature_edges")
        .select("*")
        .in_("source_node_id", [n["id"] for n in nodes_result.data])
        .execute()
    )

    return {"nodes": nodes_result.data, "edges": edges_result.data}
