"""Risk scoring for feature nodes.

Score (0-100) based on: file size, test presence, dependency age.
Badge: green (0-33), yellow (34-66), red (67-100).
"""

from pathlib import Path

from app.db import get_supabase


def _score_to_badge(score: int) -> str:
    """Map score to badge color."""
    if score <= 33:
        return "green"
    if score <= 66:
        return "yellow"
    return "red"


def _compute_file_size_risk(repo_path: str, anchor_files: list[str]) -> tuple[int, int]:
    """Compute risk from total size of anchor files. Returns (score 0-100, total_bytes)."""
    root = Path(repo_path)
    total = 0
    for rel in anchor_files:
        p = root / rel
        if p.is_file():
            try:
                total += p.stat().st_size
            except OSError:
                pass

    # Heuristic: 0-50KB=0-15, 50-200KB=15-40, 200KB-1MB=40-70, >1MB=70-100
    if total == 0:
        return 0, 0
    if total <= 50_000:
        return min(15, total // 3000), total
    if total <= 200_000:
        return 15 + min(25, (total - 50_000) // 6000), total
    if total <= 1_000_000:
        return 40 + min(30, (total - 200_000) // 26_000), total
    return min(100, 70 + (total - 1_000_000) // 50_000), total


def _compute_test_presence_risk(
    anchor_files: list[str],
    file_summaries: list[dict],
    file_tree: list[str],
) -> tuple[int, bool]:
    """Compute risk from lack of tests. Returns (score 0-100, has_tests)."""
    summary_by_path = {s["file_path"]: s for s in file_summaries}
    test_files = {ft for ft in file_tree if "test" in ft.lower() or "spec" in ft.lower()}

    # Check if any anchor file has role "test"
    for path in anchor_files:
        s = summary_by_path.get(path, {})
        if s.get("role") == "test":
            return 0, True

    # Check if anchor files have corresponding test files in same dir
    for path in anchor_files:
        base = Path(path).stem
        dir_ = str(Path(path).parent)
        for tf in test_files:
            if base in tf and (dir_ in tf or tf.startswith(dir_)):
                return 10, True

    # No tests found
    return 50, False


def _compute_dependency_age_risk(dependencies: dict) -> int:
    """Simple heuristic: many deps or very old versions = higher risk. 0-30."""
    if not dependencies:
        return 0
    count = len(dependencies)
    if count <= 5:
        return 0
    if count <= 15:
        return 10
    return 20


def _compute_node_risk(
    node: dict,
    repo_path: str,
    digest: dict,
    file_summaries: list[dict],
) -> tuple[int, dict]:
    """Compute risk score and factors for a single node."""
    anchor_files = node.get("anchor_files") or []
    file_tree = digest.get("file_tree") or []
    deps = digest.get("dependencies") or {}

    file_size_score, total_bytes = _compute_file_size_risk(repo_path, anchor_files)
    test_score, has_tests = _compute_test_presence_risk(
        anchor_files, file_summaries, file_tree
    )
    dep_score = _compute_dependency_age_risk(deps)

    # Weighted: file size 50%, test absence 40%, deps 10%
    total = int(
        file_size_score * 0.5
        + test_score * 0.4
        + dep_score * 0.1
    )
    score = min(100, total)

    factors = {
        "file_size_score": file_size_score,
        "total_anchor_bytes": total_bytes,
        "test_presence_score": test_score,
        "has_tests": has_tests,
        "dependency_score": dep_score,
    }

    return score, factors


async def compute_risk_scores(
    analysis_run_id: str,
    repo_path: str,
    digest: dict,
    file_summaries: list[dict],
    api_key: str | None = None,
) -> list[dict]:
    """Compute risk scores for all nodes in an analysis run.

    Fetches feature nodes, computes risk per node, stores in feature_risks,
    updates feature_nodes.risk_score, and returns the risk records.
    """
    db = get_supabase()

    nodes_result = (
        db.table("feature_nodes")
        .select("id, name, anchor_files")
        .eq("analysis_run_id", analysis_run_id)
        .execute()
    )
    nodes = nodes_result.data or []

    if not nodes:
        return []

    risk_rows = []
    for node in nodes:
        score, factors = _compute_node_risk(
            node, repo_path, digest, file_summaries
        )
        badge = _score_to_badge(score)
        risk_rows.append({
            "feature_node_id": node["id"],
            "score": score,
            "factors_json": factors,
            "badge_color": badge,
        })

    insert_result = db.table("feature_risks").insert(risk_rows).execute()
    inserted = insert_result.data or []

    for r in inserted:
        db.table("feature_nodes").update(
            {"risk_score": r["score"]}
        ).eq("id", r["feature_node_id"]).execute()

    return inserted
