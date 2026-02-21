from __future__ import annotations
from datetime import datetime
from pydantic import BaseModel


class AnalyzeRepoRequest(BaseModel):
    github_url: str


class RepoResponse(BaseModel):
    id: str
    github_url: str
    name: str
    default_branch: str | None = None
    loc_count: int | None = None
    framework_detected: str | None = None
    status: str  # pending | analyzing | ready | error
    created_at: datetime


class AnalysisRunResponse(BaseModel):
    id: str
    repo_id: str
    status: str
    digest_json: dict | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
