from fastapi import APIRouter, BackgroundTasks, HTTPException
from app.schemas.branches import StrategicBranchResponse
from app.db import get_supabase

router = APIRouter(prefix="/api/repos", tags=["branches"])


@router.post("/{repo_id}/simulate", response_model=list[StrategicBranchResponse])
async def simulate_futures(repo_id: str):
    """Generate 3 strategic future branches for a repo."""
    from app.services.simulation_service import generate_strategic_branches

    branches = await generate_strategic_branches(repo_id)
    return branches


@router.get("/{repo_id}/branches", response_model=list[StrategicBranchResponse])
async def get_branches(repo_id: str):
    """Retrieve previously generated strategic branches."""
    db = get_supabase()
    result = (
        db.table("strategic_branches")
        .select("*")
        .eq("repo_id", repo_id)
        .execute()
    )
    return result.data
