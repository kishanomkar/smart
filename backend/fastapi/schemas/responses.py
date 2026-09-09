from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    service: str
    timestamp: str


class StatusResponse(BaseModel):
    capture: str
    random_forest: str
    world_model: str
    shap: str
    attack_progression: str
    artifacts: dict[str, bool]


class FlowResponse(BaseModel):
    timestamp: str | None = None
    src_ip: str | None = None
    dst_ip: str | None = None
    src_port: int | None = None
    dst_port: int | None = None
    protocol: str | None = None
    prediction: str | None = None
    confidence: float | None = None
    threat_probability: float | None = None
    packets: float | None = None
    bytes: float | None = None


class ForecastPoint(BaseModel):
    horizon: int
    threat_probability: float | None = None
    predicted_label: str | None = None
    trend: str | None = None
    forecast_mode: str | None = None


class ProgressionResponse(BaseModel):
    current_stage: str = "Undetermined"
    next_likely_stage: str = "Undetermined"
    trajectory: str = "STABLE"
    stage_scores: dict[str, float] = Field(default_factory=dict)
    evidence: list[str] = Field(default_factory=list)


class ExplanationFeature(BaseModel):
    feature: str
    display_name: str
    value: float
    shap_value: float
    direction: str
    rank: int


class ExplanationResponse(BaseModel):
    prediction: str | None = None
    confidence: float | None = None
    threat_probability: float | None = None
    features: list[ExplanationFeature] = Field(default_factory=list)
    available: bool
    reason: str | None = None


class NetworkNode(BaseModel):
    id: str
    role: str | None = None


class NetworkEdge(BaseModel):
    source: str
    target: str
    protocol: str | None = None
    port: int | None = None
    packets: float | None = None
    bytes: float | None = None


class NetworkResponse(BaseModel):
    nodes: list[NetworkNode] = Field(default_factory=list)
    edges: list[NetworkEdge] = Field(default_factory=list)
    summary: dict[str, float] = Field(default_factory=dict)
    available: bool
    reason: str | None = None


class DashboardSummary(BaseModel):
    timestamp: str | None = None
    current_risk: float | None = None
    current_prediction: str | None = None
    confidence: float | None = None
    forecast: list[ForecastPoint] = Field(default_factory=list)
    attack_progression: ProgressionResponse
    explanation: ExplanationResponse
    network_graph: NetworkResponse
    latest_flow: FlowResponse | None = None


class FlowAnalysisRequest(BaseModel):
    features: dict[str, float]


class FlowAnalysisResponse(BaseModel):
    prediction: str
    confidence: float
    threat_probability: float
    explanation: ExplanationResponse


class PcapAnalysisResponse(BaseModel):
    available: bool
    reason: str
