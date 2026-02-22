from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, List

from app.services.suggestion_service import generate_suggestions_with_criteria

router = APIRouter(prefix="/api/suggestions", tags=["suggestions"])


class CriteriaRequest(BaseModel):
    criteria: Dict[str, str]


@router.post("/by-criteria", response_model=List[str])
async def get_suggestions_by_criteria(body: CriteriaRequest):
    return generate_suggestions_with_criteria(None, body.criteria)
