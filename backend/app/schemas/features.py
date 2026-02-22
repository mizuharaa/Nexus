from __future__ import annotations
from pydantic import BaseModel


class FeatureNodeResponse(BaseModel):
    id: str
    analysis_run_id: str
    name: str
    description: str
    anchor_files: list[str] = []
    parent_feature_id: str | None = None
    risk_score: int | None = None
    metadata_json: dict | None = None


class FeatureEdgeResponse(BaseModel):
    id: str
    source_node_id: str
    target_node_id: str
    edge_type: str  # tree | related


class FeatureGraphResponse(BaseModel):
    nodes: list[FeatureNodeResponse]
    edges: list[FeatureEdgeResponse]


class NodeUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None


class FeatureSuggestionResponse(BaseModel):
    id: str
    feature_node_id: str
    name: str
    rationale: str
    complexity: str
    impacted_files: list[str] = []
    test_cases: list[str] = []
    implementation_sketch: str | None = None


class SuggestionCriteria(BaseModel):
    priority: str
    complexity: str
    tags: list[str]
