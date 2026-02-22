from fastapi import APIRouter, Depends, HTTPException
from app.schemas.features import FeatureSuggestionResponse, FeatureNodeResponse, NodeUpdateRequest
from app.db import get_supabase
from app.dependencies import get_openai_key

router = APIRouter(prefix="/api/features", tags=["features"])


def _get_repo_id_for_node(db, node: dict) -> str | None:
    run_result = (
        db.table("analysis_runs")
        .select("repo_id")
        .eq("id", node["analysis_run_id"])
        .execute()
    )
    return run_result.data[0]["repo_id"] if run_result.data else None


@router.patch("/{node_id}", response_model=FeatureNodeResponse)
async def update_node(node_id: str, body: NodeUpdateRequest):
    """Update a feature node's name and/or description."""
    from app.services.graph_version_service import save_snapshot
    from app.services.graph_cache import invalidate_graph_cache

    db = get_supabase()

    node_result = db.table("feature_nodes").select("*").eq("id", node_id).execute()
    if not node_result.data:
        raise HTTPException(status_code=404, detail="Node not found")
    node = node_result.data[0]

    updates: dict = {}
    if body.name is not None:
        updates["name"] = body.name
    if body.description is not None:
        updates["description"] = body.description
    if not updates:
        return node

    repo_id = _get_repo_id_for_node(db, node)

    # Save snapshot before mutating
    if repo_id:
        save_snapshot(repo_id, node["analysis_run_id"])

    updated = db.table("feature_nodes").update(updates).eq("id", node_id).execute()

    # Delete stale suggestions so they regenerate on next click
    db.table("feature_suggestions").delete().eq("feature_node_id", node_id).execute()

    # Invalidate graph cache
    if repo_id:
        invalidate_graph_cache(repo_id)

    return updated.data[0]


@router.get("/{node_id}/suggestions", response_model=list[FeatureSuggestionResponse])
async def get_suggestions(
    node_id: str,
    openai_key: str | None = Depends(get_openai_key),
):
    """Generate or retrieve feature expansion suggestions for a node.
    Returns cached suggestions if present; otherwise calls LLM (with criteria if set).
    Criteria are cleared on save, so cache is invalidated only when user saves new criteria.
    """
    db = get_supabase()

    # Return existing suggestions if any (cache hit)
    existing = (
        db.table("feature_suggestions")
        .select("*")
        .eq("feature_node_id", node_id)
        .execute()
    )
    if existing.data:
        return existing.data

    # No cache: get repo_id and generate via LLM (with criteria if set)
    node_result = db.table("feature_nodes").select("analysis_run_id").eq("id", node_id).execute()
    if not node_result.data:
        raise HTTPException(status_code=404, detail="Node not found")

    run_result = (
        db.table("analysis_runs")
        .select("repo_id")
        .eq("id", node_result.data[0]["analysis_run_id"])
        .execute()
    )
    repo_id = run_result.data[0]["repo_id"] if run_result.data else None

    from app.services.suggestion_service import generate_suggestions

    suggestions = await generate_suggestions(node_id, repo_id=repo_id, api_key=openai_key)
    return suggestions
