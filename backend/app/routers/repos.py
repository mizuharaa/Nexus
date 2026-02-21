from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from app.schemas.repos import AnalyzeRepoRequest, RepoResponse, AnalysisRunResponse
from app.schemas.features import FeatureGraphResponse
from app.db import get_supabase
from app.dependencies import get_openai_key
from app.services.graph_cache import (
    normalize_github_url,
    get_cached_graph,
    set_cached_graph,
)

router = APIRouter(prefix="/api/repos", tags=["repos"])


@router.post("/analyze", response_model=RepoResponse)
async def analyze_repo(
    body: AnalyzeRepoRequest,
    background_tasks: BackgroundTasks,
    openai_key: str | None = Depends(get_openai_key),
):
    """Start asynchronous repo analysis. Reuses existing repo if same URL already analyzed."""
    db = get_supabase()
    normalized_url = normalize_github_url(body.github_url)

    # If we already have a ready repo for this URL, return it (graph cache by URL)
    if normalized_url:
        existing = (
            db.table("repos")
            .select("*")
            .eq("normalized_github_url", normalized_url)
            .eq("status", "ready")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if existing.data:
            return existing.data[0]

    # Insert repo record with 'pending' status
    result = (
        db.table("repos")
        .insert(
            {
                "github_url": body.github_url,
                "normalized_github_url": normalized_url or normalize_github_url(body.github_url),
                "name": body.github_url.rstrip("/").split("/")[-1],
                "status": "pending",
            }
        )
        .execute()
    )
    repo = result.data[0]

    # Kick off background analysis, passing the user's API key
    from app.workers.analysis_worker import run_analysis

    background_tasks.add_task(run_analysis, repo["id"], openai_api_key=openai_key)

    return repo


@router.get("/{repo_id}", response_model=RepoResponse)
async def get_repo(repo_id: str):
    """Get repo details and status."""
    db = get_supabase()
    result = db.table("repos").select("*").eq("id", repo_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Repo not found")
    return result.data[0]


@router.post("/{repo_id}/undo", response_model=FeatureGraphResponse)
async def undo_graph(repo_id: str):
    """Restore the previous graph snapshot (undo last graph mutation)."""
    from app.services.graph_version_service import pop_snapshot
    from app.services.graph_cache import invalidate_graph_cache

    db = get_supabase()

    snapshot = pop_snapshot(repo_id)
    if snapshot is None:
        raise HTTPException(status_code=404, detail="No snapshots to undo")

    nodes = snapshot.get("nodes", [])
    edges = snapshot.get("edges", [])

    if not nodes:
        raise HTTPException(status_code=400, detail="Snapshot is empty")

    analysis_run_id = nodes[0]["analysis_run_id"]

    # Replace current nodes and edges for this analysis run
    db.table("feature_nodes").delete().eq("analysis_run_id", analysis_run_id).execute()
    db.table("feature_edges").delete().eq("analysis_run_id", analysis_run_id).execute()

    if nodes:
        db.table("feature_nodes").insert(nodes).execute()
    if edges:
        db.table("feature_edges").insert(edges).execute()

    invalidate_graph_cache(repo_id)
    return {"nodes": nodes, "edges": [e for e in edges if e.get("edge_type") == "tree"]}


@router.get("/{repo_id}/undo/available")
async def undo_available(repo_id: str):
    """Return whether any undo snapshots exist for a repo."""
    from app.services.graph_version_service import has_snapshots
    return {"can_undo": has_snapshots(repo_id)}


@router.get("/{repo_id}/features", response_model=FeatureGraphResponse)
async def get_features(repo_id: str):
    """Get full feature graph (nodes + edges) for a repo. Uses in-memory cache when available."""
    cached = get_cached_graph(repo_id)
    if cached is not None:
        return cached

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

    nodes_data = nodes_result.data or []
    edges_data = [e for e in (edges_result.data or []) if e.get("edge_type") == "tree"]
    set_cached_graph(repo_id, nodes_data, edges_data)
    return {"nodes": nodes_data, "edges": edges_data}
