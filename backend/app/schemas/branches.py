from __future__ import annotations
from pydantic import BaseModel


class SimulateRequest(BaseModel):
    pass  # No body needed; repo_id comes from URL path


class StrategicBranchResponse(BaseModel):
    id: str
    repo_id: str
    branch_name: str
    theme: str
    initiatives_json: list[dict] = []
    architecture_impact: str | None = None
    scalability_impact: str | None = None
    risk_impact: str | None = None
    tradeoffs: str | None = None
    execution_order: list[str] = []
    narrative: str | None = None
