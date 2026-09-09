from __future__ import annotations

import importlib.util

from fastapi import APIRouter, File, HTTPException, Query, UploadFile

from ..schemas.responses import (
    DashboardSummary, ExplanationResponse, FlowAnalysisRequest, FlowAnalysisResponse,
    FlowResponse, ForecastPoint, HealthResponse, NetworkResponse, PcapAnalysisResponse,
    ProgressionResponse, StatusResponse,
)
from ..services import dashboard_service, detector_service
from ..services.offline_pipeline import analyze_offline_file
from ...benchmark_comparison import get_benchmark_comparison

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", service="netra-api", timestamp=detector_service.iso_now())


@router.get("/status", response_model=StatusResponse)
def status() -> StatusResponse:
    rf_status, _ = detector_service.model_status()
    return StatusResponse(
        capture="AVAILABLE" if detector_service._flow_path() else "NO_DATA",
        random_forest=rf_status,
        world_model="LOADED" if dashboard_service.WORLD_MODEL_PATH.is_file() else "UNAVAILABLE",
        shap="AVAILABLE" if importlib.util.find_spec("shap") is not None and rf_status == "LOADED" else "UNAVAILABLE",
        attack_progression="AVAILABLE",
        artifacts={"random_forest": rf_status == "LOADED", "world_model": dashboard_service.WORLD_MODEL_PATH.is_file(), "flows": detector_service._flow_path() is not None},
    )


@router.get("/latest", response_model=FlowResponse)
def latest() -> FlowResponse:
    value = detector_service.latest_flow()
    if value is None:
        raise HTTPException(status_code=404, detail="No flow output is available")
    return FlowResponse(**value)


@router.get("/flows", response_model=list[FlowResponse])
def flow_list(limit: int = Query(100, ge=1, le=1000)) -> list[FlowResponse]:
    return [FlowResponse(**item) for item in detector_service.flows(limit)]


@router.get("/forecast", response_model=list[ForecastPoint])
def forecast() -> list[ForecastPoint]:
    return [ForecastPoint(**item) for item in dashboard_service.forecast_rows()]


@router.get("/api/forecasts/live")
def live_forecasts():
    """Compatibility endpoint for the Live Forecast page"""
    forecasts = dashboard_service.forecast_rows()
    return {
        "success": True,
        "count": len(forecasts),
        "forecasts": forecasts
    }


@router.get("/attack-progression", response_model=ProgressionResponse)
def attack_progression() -> ProgressionResponse:
    return ProgressionResponse(**dashboard_service.progression_result())


@router.get("/explanation", response_model=ExplanationResponse)
def explanation() -> ExplanationResponse:
    return ExplanationResponse(**dashboard_service.explanation_result())


@router.get("/network", response_model=NetworkResponse)
def network() -> NetworkResponse:
    return NetworkResponse(**dashboard_service.network_result())


@router.get("/dashboard-summary", response_model=DashboardSummary)
def dashboard_summary() -> DashboardSummary:
    return DashboardSummary(**dashboard_service.summary())


@router.get("/benchmarks")
@router.get("/api/benchmarks")
def benchmarks():
    """Return empirical benchmarks comparing Baseline (Logistic Regression) vs NETRA World Model"""
    return get_benchmark_comparison()


@router.post("/analyze-flow", response_model=FlowAnalysisResponse)
def analyze_flow(request: FlowAnalysisRequest) -> FlowAnalysisResponse:
    try:
        prediction, confidence, threat, values = detector_service.analyze_features(request.features)
        result = dashboard_service.explanation_result()
        return FlowAnalysisResponse(
            prediction=prediction,
            confidence=confidence,
            threat_probability=threat,
            explanation=ExplanationResponse(**result),
        )
    except (ValueError, RuntimeError) as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.post("/analyze-pcap")
@router.post("/analyze-file")
async def analyze_pcap(file: UploadFile = File(...)):
    """Analyze uploaded PCAP or CSV flow telemetry through offline World Model pipeline"""
    content = await file.read()
    result = analyze_offline_file(file.filename or "capture.pcap", content)
    return result
