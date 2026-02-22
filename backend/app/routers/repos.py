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


@router.get("/{repo_id}/suggestion-criteria")
async def get_suggestion_criteria(repo_id: str):
    """Get current suggestion criteria for the repo."""
    from app.services.suggestion_service import get_criteria_for_repo

    db = get_supabase()
    result = db.table("repos").select("id").eq("id", repo_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Repo not found")
    return {"criteria": get_criteria_for_repo(repo_id)}


@router.post("/{repo_id}/suggestion-criteria")
async def save_suggestion_criteria(repo_id: str, body: dict):
    """Save suggestion criteria and clear all existing suggestions for the repo.
    Body: { criteria: { criterion1: "...", criterion2: "...", ... } }
    """
    from app.services.suggestion_service import set_criteria_for_repo

    db = get_supabase()
    result = db.table("repos").select("id").eq("id", repo_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Repo not found")

    criteria = body.get("criteria") or {}
    if not isinstance(criteria, dict):
        criteria = {}

    set_criteria_for_repo(repo_id, criteria)

    # Clear all feature_suggestions for nodes in this repo
    run_id = _get_active_run_id(db, repo_id)
    nodes_result = (
        db.table("feature_nodes")
        .select("id")
        .eq("analysis_run_id", run_id)
        .execute()
    )
    node_ids = [n["id"] for n in (nodes_result.data or [])]
    if node_ids:
        db.table("feature_suggestions").delete().in_("feature_node_id", node_ids).execute()

    return {"status": "ok", "message": "Criteria saved and suggestions cleared"}


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


@router.post("/{repo_id}/suggest-placement")
async def suggest_placement(
    repo_id: str,
    body: dict,
    openai_key: str | None = Depends(get_openai_key),
):
    """Return top candidate parent nodes for a new free-text feature description."""
    from app.services.placement_service import suggest_placement as _suggest_placement

    description = body.get("description", "").strip()
    if not description:
        raise HTTPException(status_code=400, detail="description is required")

    try:
        candidates = await _suggest_placement(repo_id, description, api_key=openai_key)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"candidates": candidates}


@router.post("/{repo_id}/create-suggestion")
async def create_suggestion(
    repo_id: str,
    body: dict,
    openai_key: str | None = Depends(get_openai_key),
):
    """Generate a full feature suggestion from a description and a chosen parent node."""
    from app.services.placement_service import create_suggestion_for_node

    parent_node_id = body.get("parent_node_id", "").strip()
    description = body.get("description", "").strip()
    if not parent_node_id or not description:
        raise HTTPException(status_code=400, detail="parent_node_id and description are required")

    try:
        suggestion = await create_suggestion_for_node(parent_node_id, description, api_key=openai_key)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return suggestion


def _get_active_run_id(db, repo_id: str) -> str:
    """Get the run ID to use for the current graph (excludes pending)."""
    repo = db.table("repos").select("active_analysis_run_id", "pending_analysis_run_id").eq("id", repo_id).execute()
    if not repo.data:
        raise HTTPException(status_code=404, detail="Repo not found")
    row = repo.data[0]
    # When pending exists, use active (current) - not the pending run
    active = row.get("active_analysis_run_id")
    if active:
        return active
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
    return run_result.data[0]["id"]


@router.get("/{repo_id}/features", response_model=FeatureGraphResponse)
async def get_features(repo_id: str):
    """Get full feature graph (nodes + edges) for a repo. Uses in-memory cache when available."""
    cached = get_cached_graph(repo_id)
    if cached is not None:
        return cached

    db = get_supabase()
    run_id = _get_active_run_id(db, repo_id)

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


@router.post("/{repo_id}/update-graph")
async def start_update_graph(
    repo_id: str,
    background_tasks: BackgroundTasks,
    openai_key: str | None = Depends(get_openai_key),
):
    """Start re-analysis with current graph context. Creates pending update for preview."""
    db = get_supabase()
    result = db.table("repos").select("*").eq("id", repo_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Repo not found")
    repo = result.data[0]
    if repo["status"] not in ("ready", "updating"):
        raise HTTPException(status_code=400, detail="Repo must be ready to update graph")
    if repo.get("pending_analysis_run_id"):
        raise HTTPException(status_code=400, detail="A pending update already exists. Apply or revert it first.")

    from app.workers.analysis_worker import run_analysis_update
    background_tasks.add_task(run_analysis_update, repo_id, openai_api_key=openai_key)

    db.table("repos").update({"status": "updating"}).eq("id", repo_id).execute()
    return {"status": "updating", "message": "Re-analyzing repository..."}


@router.get("/{repo_id}/update-graph/pending")
async def get_pending_update(repo_id: str):
    """Get pending graph update with diff for preview modal."""
    db = get_supabase()
    repo = db.table("repos").select("pending_analysis_run_id", "active_analysis_run_id").eq("id", repo_id).execute()
    if not repo.data or not repo.data[0].get("pending_analysis_run_id"):
        raise HTTPException(status_code=404, detail="No pending update")

    pending_run_id = repo.data[0]["pending_analysis_run_id"]
    active_run_id = repo.data[0].get("active_analysis_run_id")

    if not active_run_id:
        run_result = (
            db.table("analysis_runs")
            .select("id")
            .eq("repo_id", repo_id)
            .eq("status", "completed")
            .neq("id", pending_run_id)
            .order("completed_at", desc=True)
            .limit(1)
            .execute()
        )
        active_run_id = run_result.data[0]["id"] if run_result.data else None

    if not active_run_id:
        raise HTTPException(status_code=404, detail="No current graph to diff against")

    # Fetch current and pending nodes
    current_nodes = (
        db.table("feature_nodes").select("*").eq("analysis_run_id", active_run_id).execute()
    ).data or []
    pending_nodes = (
        db.table("feature_nodes").select("*").eq("analysis_run_id", pending_run_id).execute()
    ).data or []
    pending_edges = (
        db.table("feature_edges")
        .select("*")
        .eq("analysis_run_id", pending_run_id)
        .eq("edge_type", "tree")
        .execute()
    ).data or []

    current_ids = {n["id"] for n in current_nodes}
    pending_names = {n["name"] for n in pending_nodes}

    current_by_name = {c["name"]: c for c in current_nodes}
    added = [n for n in pending_nodes if n["name"] not in current_by_name]
    removed = [n for n in current_nodes if n["name"] not in pending_names]
    updated = []
    for p in pending_nodes:
        c = current_by_name.get(p["name"])
        if c and (
            c.get("description") != p.get("description")
            or c.get("anchor_files") != p.get("anchor_files")
        ):
            updated.append({"before": c, "after": p})

    # Check execution history per removed node
    removed_ids = [n["id"] for n in removed]
    node_has_execution: dict[str, bool] = {}
    if removed_ids:
        suggs = (
            db.table("feature_suggestions")
            .select("feature_node_id")
            .in_("feature_node_id", removed_ids)
            .execute()
        )
        for s in (suggs.data or []):
            node_has_execution[s["feature_node_id"]] = True
    for n in removed:
        if n["id"] not in node_has_execution:
            node_has_execution[n["id"]] = False

    return {
        "nodes": pending_nodes,
        "edges": pending_edges,
        "diff": {
            "added": [{"name": n["name"], "description": n.get("description", "")} for n in added],
            "removed": [{"name": n["name"], "description": n.get("description", ""), "has_execution": node_has_execution.get(n["id"], False)} for n in removed],
            "updated": [
                {"name": u["after"]["name"], "before": u["before"], "after": u["after"]}
                for u in updated
            ],
        },
    }


@router.post("/{repo_id}/update-graph/apply")
async def apply_pending_update(repo_id: str):
    """Apply the pending graph update (make it the active graph)."""
    from app.services.graph_cache import invalidate_graph_cache

    db = get_supabase()
    repo = db.table("repos").select("pending_analysis_run_id").eq("id", repo_id).execute()
    if not repo.data or not repo.data[0].get("pending_analysis_run_id"):
        raise HTTPException(status_code=400, detail="No pending update to apply")

    pending_run_id = repo.data[0]["pending_analysis_run_id"]
    db.table("repos").update({
        "active_analysis_run_id": pending_run_id,
        "pending_analysis_run_id": None,
    }).eq("id", repo_id).execute()
    invalidate_graph_cache(repo_id)
    return {"status": "applied"}


@router.post("/{repo_id}/update-graph/revert")
async def revert_pending_update(repo_id: str):
    """Revert the pending update (delete the new run, keep current graph)."""
    from app.db import get_supabase
    from app.services.graph_cache import invalidate_graph_cache

    db = get_supabase()
    repo = db.table("repos").select("pending_analysis_run_id").eq("id", repo_id).execute()
    if not repo.data or not repo.data[0].get("pending_analysis_run_id"):
        raise HTTPException(status_code=400, detail="No pending update to revert")

    pending_run_id = repo.data[0]["pending_analysis_run_id"]
    db.table("repos").update({"pending_analysis_run_id": None}).eq("id", repo_id).execute()
    db.table("feature_edges").delete().eq("analysis_run_id", pending_run_id).execute()
    db.table("feature_nodes").delete().eq("analysis_run_id", pending_run_id).execute()
    db.table("analysis_runs").delete().eq("id", pending_run_id).execute()
    invalidate_graph_cache(repo_id)
    return {"status": "reverted"}
