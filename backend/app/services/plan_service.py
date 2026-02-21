"""Plan chat service — LLM-powered planning assistant per repo."""

from __future__ import annotations

from pydantic import BaseModel

from app.db import get_supabase
from app.services.llm_service import call_llm_structured


# ---------------------------------------------------------------------------
# LLM response model
# ---------------------------------------------------------------------------


class PlanLLMResponse(BaseModel):
    response: str
    suggested_goals: list[str] = []
    related_feature_ids: list[str] = []


# ---------------------------------------------------------------------------
# Conversation management
# ---------------------------------------------------------------------------


def get_or_create_conversation(repo_id: str) -> str:
    """Return the latest conversation ID for a repo, creating one if needed."""
    db = get_supabase()

    result = (
        db.table("plan_conversations")
        .select("id")
        .eq("repo_id", repo_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if result.data:
        return result.data[0]["id"]

    new_conv = (
        db.table("plan_conversations")
        .insert({"repo_id": repo_id})
        .execute()
    )
    return new_conv.data[0]["id"]


def create_new_conversation(repo_id: str) -> str:
    """Create a fresh conversation for the repo (new plan)."""
    db = get_supabase()
    result = db.table("plan_conversations").insert({"repo_id": repo_id}).execute()
    return result.data[0]["id"]


def get_conversation_messages(conversation_id: str) -> list[dict]:
    db = get_supabase()
    result = (
        db.table("plan_messages")
        .select("*")
        .eq("conversation_id", conversation_id)
        .order("created_at", desc=False)
        .execute()
    )
    return result.data or []


# ---------------------------------------------------------------------------
# LLM call
# ---------------------------------------------------------------------------


def _build_graph_summary(repo_id: str) -> str:
    """Build a compact summary of the feature graph for LLM context."""
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
        return "(no analysis available)"

    run_id = run_result.data[0]["id"]
    nodes = (
        db.table("feature_nodes")
        .select("id, name, description, parent_feature_id")
        .eq("analysis_run_id", run_id)
        .execute()
    ).data or []

    if not nodes:
        return "(no features detected)"

    lines = []
    for n in nodes[:40]:  # cap at 40 nodes for context size
        parent = n.get("parent_feature_id") or "root"
        lines.append(f"- [{n['id'][:8]}] {n['name']} (parent: {parent[:8] if parent != 'root' else 'root'})")
    return "\n".join(lines)


def _valid_node_ids(repo_id: str) -> set[str]:
    """Return all valid feature node IDs for the repo."""
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
        return set()
    nodes = (
        db.table("feature_nodes")
        .select("id")
        .eq("analysis_run_id", run_result.data[0]["id"])
        .execute()
    ).data or []
    return {n["id"] for n in nodes}


async def send_plan_message(
    repo_id: str,
    conversation_id: str,
    user_message: str,
    api_key: str | None = None,
) -> dict:
    """Append user message, call LLM, store and return assistant message."""
    db = get_supabase()

    # Store user message
    db.table("plan_messages").insert({
        "conversation_id": conversation_id,
        "role": "user",
        "content": user_message,
        "suggested_goals": [],
        "related_feature_ids": [],
    }).execute()

    # Build conversation history for context (last 10 messages)
    history = get_conversation_messages(conversation_id)[-10:]
    history_text = "\n".join(
        f"{m['role'].upper()}: {m['content']}"
        for m in history
        if m["role"] in ("user", "assistant")
    )

    graph_summary = _build_graph_summary(repo_id)

    system_prompt = (
        "You are a product planning assistant helping a developer plan features for their software project. "
        "You have access to the project's current feature graph.\n\n"
        "Given the conversation and feature graph, provide helpful planning guidance. Return a JSON object with:\n"
        "- response: your planning advice (2-4 sentences, conversational tone)\n"
        "- suggested_goals: list of 2-3 short actionable goal suggestions the user might want to pursue next "
        "(e.g. 'Add rate limiting', 'Improve auth security', 'Add email notifications'). "
        "These will be shown as clickable chips.\n"
        "- related_feature_ids: list of up to 4 feature node IDs from the graph that are most relevant to this "
        "planning conversation. Use the FULL UUID from the graph (not the 8-char prefix). "
        "Only include IDs that exist in the provided graph.\n\n"
        "Be specific to the actual features in the graph. If the user asks about a topic, "
        "identify which existing features relate to it."
    )

    user_prompt = (
        f"Feature graph:\n{graph_summary}\n\n"
        f"Conversation so far:\n{history_text}\n\n"
        f"Latest user message: {user_message}"
    )

    llm_response = await call_llm_structured(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        response_model=PlanLLMResponse,
        api_key=api_key,
    )

    # Validate related_feature_ids against real node IDs
    valid_ids = _valid_node_ids(repo_id)
    related_ids = [fid for fid in llm_response.related_feature_ids if fid in valid_ids]

    # Store assistant message
    result = db.table("plan_messages").insert({
        "conversation_id": conversation_id,
        "role": "assistant",
        "content": llm_response.response,
        "suggested_goals": llm_response.suggested_goals,
        "related_feature_ids": related_ids,
    }).execute()

    return result.data[0]


def enrich_messages_with_nodes(messages: list[dict], repo_id: str) -> list[dict]:
    """Attach full node data for related_feature_ids in assistant messages."""
    all_ids: set[str] = set()
    for m in messages:
        if m["role"] == "assistant":
            all_ids.update(m.get("related_feature_ids") or [])

    if not all_ids:
        return messages

    db = get_supabase()
    nodes_result = (
        db.table("feature_nodes")
        .select("id, name, description")
        .in_("id", list(all_ids))
        .execute()
    )
    node_map = {n["id"]: n for n in (nodes_result.data or [])}

    enriched = []
    for m in messages:
        if m["role"] == "assistant":
            m = dict(m)
            m["related_features"] = [
                node_map[fid]
                for fid in (m.get("related_feature_ids") or [])
                if fid in node_map
            ]
        enriched.append(m)
    return enriched
