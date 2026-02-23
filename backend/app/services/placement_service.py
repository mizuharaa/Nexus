"""Placement service: find best parent node and create a suggestion from a free-text description."""

from __future__ import annotations

from pydantic import BaseModel

from app.db import get_supabase
from app.services.llm_service import call_llm_structured


# ---------------------------------------------------------------------------
# LLM models
# ---------------------------------------------------------------------------


class PlacementCandidate(BaseModel):
    node_id: str
    node_name: str
    rationale: str


class PlacementResult(BaseModel):
    candidates: list[PlacementCandidate]


class SuggestionDraft(BaseModel):
    name: str
    rationale: str
    complexity: str          # low | medium | high
    impacted_files: list[str] = []
    test_cases: list[str] = []
    implementation_sketch: str | None = None


# ---------------------------------------------------------------------------
# suggest-placement
# ---------------------------------------------------------------------------


async def suggest_placement(
    repo_id: str,
    description: str,
    api_key: str | None = None,
) -> list[dict]:
    """Return top candidate parent nodes for placing a new feature."""
    db = get_supabase()

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
        raise ValueError("No completed analysis run found")

    run_id = run_result.data[0]["id"]
    nodes_result = (
        db.table("feature_nodes")
        .select("id, name, description, parent_feature_id")
        .eq("analysis_run_id", run_id)
        .execute()
    )
    nodes = nodes_result.data or []
    if not nodes:
        raise ValueError("No feature nodes found")

    node_list = "\n".join(
        f"ID: {n['id']} | Name: {n['name']!r} | Parent: {n.get('parent_feature_id') or 'root'} | Desc: {(n.get('description') or '')[:80]}"
        for n in nodes
    )

    system_prompt = (
        "You are a software architect. Given a product feature graph and a new feature "
        "description, identify the 3 best candidate parent nodes to place the new feature under.\n\n"
        "Return a JSON object with key 'candidates' containing exactly 3 items (or fewer if "
        "the graph has fewer nodes), each with:\n"
        "- node_id: the exact ID from the provided list\n"
        "- node_name: the node's name\n"
        "- rationale: one sentence explaining why this is a good parent\n\n"
        "Only use node IDs that exist in the provided list. Order by best fit first."
    )

    user_prompt = (
        f"Feature graph:\n{node_list}\n\n"
        f"New feature to add: {description}"
    )

    result = await call_llm_structured(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        response_model=PlacementResult,
        api_key=api_key,
    )

    # Validate node_ids exist
    valid_ids = {n["id"] for n in nodes}
    return [
        {"node_id": c.node_id, "node_name": c.node_name, "rationale": c.rationale}
        for c in result.candidates
        if c.node_id in valid_ids
    ]


# ---------------------------------------------------------------------------
# create-suggestion
# ---------------------------------------------------------------------------


async def create_suggestion_for_node(
    parent_node_id: str,
    description: str,
    api_key: str | None = None,
) -> dict:
    """Generate a full feature suggestion from a free-text description and insert it."""
    db = get_supabase()

    node_result = db.table("feature_nodes").select("*").eq("id", parent_node_id).execute()
    if not node_result.data:
        raise ValueError(f"Node {parent_node_id} not found")
    node = node_result.data[0]

    # Get analysis context
    run_result = (
        db.table("analysis_runs")
        .select("digest_json")
        .eq("id", node["analysis_run_id"])
        .execute()
    )
    digest = (run_result.data[0].get("digest_json") or {}) if run_result.data else {}

    system_prompt = (
        "You are a senior engineer writing a feature implementation specification. "
        "Given a parent feature node and a user's description of a new sub-feature, "
        "produce a detailed implementation spec.\n\n"
        "Return a JSON object with:\n"
        "- name: concise feature name (5-8 words)\n"
        "- rationale: 1-2 sentences explaining value and fit within the parent feature\n"
        "- complexity: one of 'low', 'medium', 'high'\n"
        "- impacted_files: list of file paths likely to be created or modified (max 10)\n"
        "- test_cases: list of test case descriptions (3-5 items)\n"
        "- implementation_sketch: brief pseudocode or step-by-step description (3-6 steps)\n\n"
        "Be concrete and reference the actual tech stack and parent feature context."
    )

    user_prompt = (
        f"Parent feature: {node['name']}\n"
        f"Parent description: {node.get('description', '')}\n"
        f"Framework: {digest.get('framework', 'unknown')}\n\n"
        f"New feature requested: {description}"
    )

    draft = await call_llm_structured(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        response_model=SuggestionDraft,
        api_key=api_key,
    )

    insert_result = db.table("feature_suggestions").insert({
        "feature_node_id": parent_node_id,
        "name": draft.name,
        "rationale": draft.rationale,
        "complexity": draft.complexity,
        "impacted_files": draft.impacted_files,
        "test_cases": draft.test_cases,
        "implementation_sketch": draft.implementation_sketch,
    }).execute()

    return insert_result.data[0]
