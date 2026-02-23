"""Graph snapshot service for undo stack (max 10 snapshots per repo)."""

from __future__ import annotations

from app.db import get_supabase

MAX_SNAPSHOTS = 10


def save_snapshot(repo_id: str, analysis_run_id: str) -> None:
    """Capture the current graph state as a snapshot before a mutation.

    Fetches current feature_nodes and feature_edges for the latest analysis run,
    stores them as JSON in graph_snapshots, then prunes to MAX_SNAPSHOTS per repo.
    """
    db = get_supabase()

    nodes_result = (
        db.table("feature_nodes")
        .select("*")
        .eq("analysis_run_id", analysis_run_id)
        .execute()
    )
    edges_result = (
        db.table("feature_edges")
        .select("*")
        .eq("analysis_run_id", analysis_run_id)
        .execute()
    )

    snapshot_json = {
        "nodes": nodes_result.data or [],
        "edges": edges_result.data or [],
    }

    db.table("graph_snapshots").insert(
        {
            "repo_id": repo_id,
            "analysis_run_id": analysis_run_id,
            "snapshot_json": snapshot_json,
        }
    ).execute()

    _prune_snapshots(repo_id)


def _prune_snapshots(repo_id: str) -> None:
    """Keep only the MAX_SNAPSHOTS most recent snapshots for a repo."""
    db = get_supabase()

    all_snapshots = (
        db.table("graph_snapshots")
        .select("id, created_at")
        .eq("repo_id", repo_id)
        .order("created_at", desc=True)
        .execute()
    )

    snapshots = all_snapshots.data or []
    if len(snapshots) <= MAX_SNAPSHOTS:
        return

    ids_to_delete = [s["id"] for s in snapshots[MAX_SNAPSHOTS:]]
    db.table("graph_snapshots").delete().in_("id", ids_to_delete).execute()


def pop_snapshot(repo_id: str) -> dict | None:
    """Return and remove the most recent snapshot for a repo (undo operation).

    Returns the snapshot_json dict or None if no snapshots exist.
    """
    db = get_supabase()

    result = (
        db.table("graph_snapshots")
        .select("*")
        .eq("repo_id", repo_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    if not result.data:
        return None

    snapshot = result.data[0]
    db.table("graph_snapshots").delete().eq("id", snapshot["id"]).execute()
    return snapshot["snapshot_json"]


def has_snapshots(repo_id: str) -> bool:
    """Return True if there are any snapshots available for undo."""
    db = get_supabase()
    result = (
        db.table("graph_snapshots")
        .select("id")
        .eq("repo_id", repo_id)
        .limit(1)
        .execute()
    )
    return bool(result.data)
