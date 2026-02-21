"""Feature expansion suggestions for a given node."""

import json

from pydantic import BaseModel

from app.db import get_supabase
from app.services.llm_service import call_llm_structured_list


# ---------------------------------------------------------------------------
# Pydantic model for LLM structured output
# ---------------------------------------------------------------------------


class SuggestionItem(BaseModel):
    name: str
    rationale: str
    complexity: str  # low | medium | high
    impacted_files: list[str] = []
    test_cases: list[str] = []
    implementation_sketch: str | None = None


# ---------------------------------------------------------------------------
# LLM call
# ---------------------------------------------------------------------------


async def _call_llm_for_suggestions(
    node: dict,
    digest: dict,
    api_key: str | None = None,
) -> list[dict]:
    """Call the LLM to generate 3-8 feature expansion suggestions."""
    system_prompt = (
        "You are a senior software architect suggesting feature expansions "
        "for an existing codebase. Given a specific feature node and the "
        "repo context, suggest 3 to 8 related feature expansions.\n\n"
        "Return a JSON object with key 'suggestions' containing a list. "
        "Each suggestion must have:\n"
        "- name (string): concise feature name\n"
        "- rationale (string): 1-2 sentences on why this fits\n"
        "- complexity (string): one of 'low', 'medium', 'high'\n"
        "- impacted_files (list[string]): approximate file paths affected\n"
        "- test_cases (list[string]): suggested test descriptions\n"
        "- implementation_sketch (string): brief implementation approach\n\n"
        "Suggestions should be practical, actionable, and relevant to the "
        "existing feature. Vary the complexity across suggestions."
    )

    user_content = (
        f"Feature: {node['name']}\n"
        f"Description: {node['description']}\n"
        f"Anchor files: {json.dumps(node.get('anchor_files', []))}\n\n"
        f"Repository context:\n"
        f"Framework: {digest.get('framework', 'unknown')}\n"
        f"Dependencies: {json.dumps(digest.get('dependencies', {}))}\n"
        f"File tree:\n{chr(10).join(digest.get('file_tree', [])[:100])}\n"
    )

    items = await call_llm_structured_list(
        system_prompt=system_prompt,
        user_prompt=user_content,
        item_model=SuggestionItem,
        list_key="suggestions",
        api_key=api_key,
    )
    return [item.model_dump() for item in items]


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------


async def generate_suggestions(
    node_id: str, api_key: str | None = None
) -> list[dict]:
    """Generate 3-8 related feature expansions for a node.

    Fetches the node and repo context from Supabase, calls the LLM,
    stores the suggestions in the database, and returns them.
    """
    db = get_supabase()

    # Fetch the feature node
    node_result = (
        db.table("feature_nodes")
        .select("*")
        .eq("id", node_id)
        .execute()
    )
    if not node_result.data:
        raise ValueError(f"Feature node {node_id} not found")

    node = node_result.data[0]

    # Fetch the analysis run to get the digest
    run_result = (
        db.table("analysis_runs")
        .select("*")
        .eq("id", node["analysis_run_id"])
        .execute()
    )
    if not run_result.data:
        raise ValueError(f"Analysis run {node['analysis_run_id']} not found")

    digest = run_result.data[0].get("digest_json", {}) or {}

    # Call LLM for suggestions
    raw_suggestions = await _call_llm_for_suggestions(
        node=node, digest=digest, api_key=api_key
    )

    if not raw_suggestions:
        return []

    # Store in Supabase
    rows = [
        {
            "feature_node_id": node_id,
            "name": s["name"],
            "rationale": s["rationale"],
            "complexity": s["complexity"],
            "impacted_files": s.get("impacted_files", []),
            "test_cases": s.get("test_cases", []),
            "implementation_sketch": s.get("implementation_sketch"),
        }
        for s in raw_suggestions
    ]

    insert_result = db.table("feature_suggestions").insert(rows).execute()
    return insert_result.data
