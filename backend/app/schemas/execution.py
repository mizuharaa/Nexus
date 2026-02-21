from __future__ import annotations
from datetime import datetime
from pydantic import BaseModel


class BuildRequest(BaseModel):
    suggestion_id: str


class UpdatePlanRequest(BaseModel):
    plan_md: str


class ExecutionRunResponse(BaseModel):
    id: str
    feature_suggestion_id: str
    repo_id: str
    status: str  # queued|cloning|planning|testing|awaiting_approval|building|verifying|pushing|done|failed
    sandbox_path: str | None = None
    branch_name: str | None = None
    pr_url: str | None = None
    pr_merged: bool = False
    plan_md: str | None = None
    iteration_count: int = 0
    started_at: datetime | None = None
    completed_at: datetime | None = None


class ExecutionLogResponse(BaseModel):
    id: str
    execution_run_id: str
    step: str
    message: str
    log_level: str  # info | warn | error
    timestamp: datetime
