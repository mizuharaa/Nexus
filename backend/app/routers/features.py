from fastapi import APIRouter, HTTPException
from app.schemas.features import FeatureSuggestionResponse
from app.db import get_supabase

router = APIRouter(prefix="/api/features", tags=["features"])


@router.get("/{node_id}/suggestions", response_model=list[FeatureSuggestionResponse])
async def get_suggestions(node_id: str):
    """Generate or retrieve feature expansion suggestions for a node."""
    db = get_supabase()

    # Check if suggestions already exist
    existing = (
        db.table("feature_suggestions")
        .select("*")
        .eq("feature_node_id", node_id)
        .execute()
    )
    if existing.data:
        return existing.data

    # Generate suggestions via LLM
    from app.services.suggestion_service import generate_suggestions

    suggestions = await generate_suggestions(node_id)
    return suggestions
