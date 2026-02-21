from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import StreamingResponse
from app.schemas.execution import (
    BuildRequest,
    ExecutionRunResponse,
    ExecutionLogResponse,
)
from app.db import get_supabase

router = APIRouter(prefix="/api", tags=["execution"])


@router.post(
    "/features/{node_id}/build", response_model=ExecutionRunResponse
)
async def build_feature(
    node_id: str, body: BuildRequest, background_tasks: BackgroundTasks
):
    """Trigger autonomous feature implementation via Claude Code."""
    db = get_supabase()

    # Validate the suggestion exists
    suggestion = (
        db.table("feature_suggestions")
        .select("*")
        .eq("id", body.suggestion_id)
        .execute()
    )
    if not suggestion.data:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    # Get repo_id from the feature node
    node = (
        db.table("feature_nodes")
        .select("analysis_run_id")
        .eq("id", node_id)
        .execute()
    )
    if not node.data:
        raise HTTPException(status_code=404, detail="Feature node not found")

    run_result = (
        db.table("analysis_runs")
        .select("repo_id")
        .eq("id", node.data[0]["analysis_run_id"])
        .execute()
    )
    repo_id = run_result.data[0]["repo_id"]

    # Create execution run record
    exec_result = (
        db.table("execution_runs")
        .insert(
            {
                "feature_suggestion_id": body.suggestion_id,
                "repo_id": repo_id,
                "status": "queued",
                "iteration_count": 0,
            }
        )
        .execute()
    )
    execution_run = exec_result.data[0]

    # Kick off background execution
    from app.workers.analysis_worker import run_execution

    background_tasks.add_task(run_execution, execution_run["id"])

    return execution_run


@router.get("/execution/{run_id}", response_model=ExecutionRunResponse)
async def get_execution_status(run_id: str):
    """Get execution run status."""
    db = get_supabase()
    result = db.table("execution_runs").select("*").eq("id", run_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Execution run not found")
    return result.data[0]


@router.get("/execution/{run_id}/logs", response_model=list[ExecutionLogResponse])
async def get_execution_logs(run_id: str):
    """Get execution logs for a run."""
    db = get_supabase()
    result = (
        db.table("execution_logs")
        .select("*")
        .eq("execution_run_id", run_id)
        .order("timestamp", desc=False)
        .execute()
    )
    return result.data
