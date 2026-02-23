from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from app.schemas.execution import (
    BuildRequest,
    UpdatePlanRequest,
    PlanFeedbackRequest,
    ExecutionRunResponse,
    ExecutionLogResponse,
)
from app.db import get_supabase
from app.dependencies import get_openai_key

router = APIRouter(prefix="/api", tags=["execution"])


@router.post(
    "/features/{node_id}/build", response_model=ExecutionRunResponse
)
async def build_feature(
    node_id: str,
    body: BuildRequest,
    background_tasks: BackgroundTasks,
    openai_key: str | None = Depends(get_openai_key),
):
    """Trigger plan generation phase. Plan is shown to user for approval before building."""
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

    # Kick off plan phase only (not the full build)
    from app.workers.analysis_worker import run_plan_phase

    background_tasks.add_task(
        run_plan_phase, execution_run["id"], openai_api_key=openai_key
    )

    return execution_run


@router.post("/execution/{run_id}/approve", response_model=ExecutionRunResponse)
async def approve_execution(
    run_id: str,
    background_tasks: BackgroundTasks,
):
    """Approve the generated plan and start the Claude Code build phase."""
    db = get_supabase()
    result = db.table("execution_runs").select("*").eq("id", run_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Execution run not found")

    run = result.data[0]
    if run["status"] != "awaiting_approval":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve run in status '{run['status']}'. Expected 'awaiting_approval'.",
        )

    # Kick off build phase
    from app.workers.analysis_worker import run_build_phase

    background_tasks.add_task(run_build_phase, run_id)

    # Return the current run (status will update in background)
    return run


@router.post("/execution/{run_id}/retry", response_model=ExecutionRunResponse)
async def retry_execution(
    run_id: str,
    background_tasks: BackgroundTasks,
):
    """Retry a failed build with error context from previous attempt."""
    db = get_supabase()
    result = db.table("execution_runs").select("*").eq("id", run_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Execution run not found")

    run = result.data[0]
    if run["status"] != "failed":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot retry run in status '{run['status']}'. Expected 'failed'.",
        )

    from app.workers.analysis_worker import run_retry_build

    background_tasks.add_task(run_retry_build, run_id)

    return run


@router.put("/execution/{run_id}/plan", response_model=ExecutionRunResponse)
async def update_plan(
    run_id: str,
    body: UpdatePlanRequest,
):
    """Update the plan text for a failed execution before retrying."""
    db = get_supabase()
    result = db.table("execution_runs").select("*").eq("id", run_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Execution run not found")

    run = result.data[0]
    if run["status"] not in ("failed", "awaiting_approval"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot edit plan in status '{run['status']}'. Expected 'failed' or 'awaiting_approval'.",
        )

    db.table("execution_runs").update(
        {"plan_md": body.plan_md}
    ).eq("id", run_id).execute()

    updated = db.table("execution_runs").select("*").eq("id", run_id).execute().data[0]
    return updated


@router.post("/execution/{run_id}/plan-feedback", response_model=ExecutionRunResponse)
async def submit_plan_feedback(
    run_id: str,
    body: PlanFeedbackRequest,
    background_tasks: BackgroundTasks,
    openai_key: str | None = Depends(get_openai_key),
):
    """Submit user feedback and regenerate the plan so OpenAI can integrate it (same plan rules, feedback in user message)."""
    if body.rating not in ("positive", "negative"):
        raise HTTPException(
            status_code=400,
            detail="rating must be 'positive' or 'negative'.",
        )
    db = get_supabase()
    result = db.table("execution_runs").select("*").eq("id", run_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Execution run not found")

    run = result.data[0]
    if not run.get("plan_md"):
        raise HTTPException(
            status_code=400,
            detail="No plan to give feedback on.",
        )

    db.table("execution_runs").update({
        "plan_feedback_rating": body.rating,
        "plan_feedback_comment": body.comment or None,
    }).eq("id", run_id).execute()

    if run.get("status") == "awaiting_approval" and run.get("sandbox_path"):
        from app.workers.analysis_worker import run_regenerate_plan_with_feedback

        db.table("execution_runs").update({"status": "planning"}).eq("id", run_id).execute()
        background_tasks.add_task(
            run_regenerate_plan_with_feedback, run_id, openai_api_key=openai_key
        )

    updated = db.table("execution_runs").select("*").eq("id", run_id).execute().data[0]
    return updated


@router.post("/execution/{run_id}/abandon", response_model=ExecutionRunResponse)
async def abandon_execution_route(run_id: str):
    """Abandon a failed execution and clean up its sandbox."""
    db = get_supabase()
    result = db.table("execution_runs").select("*").eq("id", run_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Execution run not found")

    from app.services.execution_service import abandon_execution

    await abandon_execution(run_id)

    updated = db.table("execution_runs").select("*").eq("id", run_id).execute().data[0]
    return updated


@router.post("/execution/{run_id}/on-merged", response_model=ExecutionRunResponse)
async def on_pr_merged(run_id: str):
    """Mark a completed run's PR as merged and add the built feature as a child node."""
    import uuid
    from app.services.graph_cache import invalidate_graph_cache

    db = get_supabase()
    result = db.table("execution_runs").select("*").eq("id", run_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Execution run not found")

    run = result.data[0]
    if run["status"] != "done":
        raise HTTPException(status_code=400, detail="Run must be in 'done' status")
    if run.get("pr_merged"):
        return run  # idempotent — already processed

    # Fetch suggestion and its parent node
    suggestion = (
        db.table("feature_suggestions")
        .select("*")
        .eq("id", run["feature_suggestion_id"])
        .execute()
    )
    if not suggestion.data:
        raise HTTPException(status_code=404, detail="Suggestion not found")
    sugg = suggestion.data[0]

    parent_node_id = sugg["feature_node_id"]
    parent_node = (
        db.table("feature_nodes").select("*").eq("id", parent_node_id).execute()
    )
    if not parent_node.data:
        raise HTTPException(status_code=404, detail="Parent feature node not found")

    analysis_run_id = parent_node.data[0]["analysis_run_id"]

    # Create child node representing what was built
    new_node_id = str(uuid.uuid4())
    db.table("feature_nodes").insert({
        "id": new_node_id,
        "analysis_run_id": analysis_run_id,
        "name": sugg["name"],
        "description": sugg.get("rationale", ""),
        "parent_feature_id": parent_node_id,
        "anchor_files": sugg.get("impacted_files", []),
    }).execute()

    # Create tree edge
    db.table("feature_edges").insert({
        "analysis_run_id": analysis_run_id,
        "source_node_id": parent_node_id,
        "target_node_id": new_node_id,
        "edge_type": "tree",
    }).execute()

    # Mark run as merged and invalidate graph cache
    updated = (
        db.table("execution_runs")
        .update({"pr_merged": True})
        .eq("id", run_id)
        .execute()
    )
    invalidate_graph_cache(run["repo_id"])

    return updated.data[0]


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
