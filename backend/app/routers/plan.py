from fastapi import APIRouter, Depends, HTTPException
from app.db import get_supabase
from app.dependencies import get_openai_key

router = APIRouter(prefix="/api/repos", tags=["plan"])


@router.get("/{repo_id}/plan/conversation")
async def get_conversation(repo_id: str):
    """Get or create the current plan conversation and its messages."""
    from app.services.plan_service import (
        get_or_create_conversation,
        get_conversation_messages,
        enrich_messages_with_nodes,
    )

    conversation_id = get_or_create_conversation(repo_id)
    messages = get_conversation_messages(conversation_id)
    enriched = enrich_messages_with_nodes(messages, repo_id)
    return {"conversation_id": conversation_id, "messages": enriched}


@router.post("/{repo_id}/plan/messages")
async def send_message(
    repo_id: str,
    body: dict,
    openai_key: str | None = Depends(get_openai_key),
):
    """Send a user message, get LLM response with goals and related features."""
    from app.services.plan_service import (
        get_or_create_conversation,
        send_plan_message,
    )

    message = body.get("message", "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="message is required")

    conversation_id = get_or_create_conversation(repo_id)

    try:
        assistant_msg = await send_plan_message(
            repo_id, conversation_id, message, api_key=openai_key
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Enrich with node data before returning
    from app.services.plan_service import enrich_messages_with_nodes
    enriched = enrich_messages_with_nodes([assistant_msg], repo_id)
    return enriched[0]


@router.post("/{repo_id}/plan/new")
async def new_conversation(repo_id: str):
    """Start a fresh plan conversation."""
    from app.services.plan_service import create_new_conversation
    conversation_id = create_new_conversation(repo_id)
    return {"conversation_id": conversation_id, "messages": []}
