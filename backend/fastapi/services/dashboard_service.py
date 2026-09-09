from __future__ import annotations

from pathlib import Path
from typing import Any

from .detector_service import _DETECTOR, BASE_DIR

WORLD_MODEL_PATH = BASE_DIR / "models" / "world_model.pt"

def forecast_rows() -> list[dict[str, Any]]:
    insight = _DETECTOR.get_latest_insight()
    if not insight or "forecast" not in insight:
        return []

    forecast = insight["forecast"]
    result = []
    for p in forecast:
        result.append({
            "horizon": p["horizon"],
            "threat_probability": p["threat_probability"],
            "predicted_label": p["label"],
            "trend": "ESCALATING" if p["threat_probability"] > 0.5 else "STABLE",
            "forecast_mode": "World Model (LSTM)",
        })
    return sorted(result, key=lambda item: item["horizon"])

def progression_result() -> dict[str, Any]:
    insight = _DETECTOR.get_latest_insight()
    if not insight or "progression" not in insight:
        return {"current_stage": "Undetermined", "next_likely_stage": "Undetermined", "trajectory": "STABLE", "stage_scores": {}, "evidence": []}

    return insight["progression"]

def explanation_result() -> dict[str, Any]:
    insight = _DETECTOR.get_latest_insight()
    if not insight or "explanation" not in insight:
        return {"available": False, "features": [], "reason": "No explanation available"}

    explanation = insight["explanation"]
    return {
        "available": True,
        "prediction": "Forecasting...",
        "confidence": 1.0,
        "threat_probability": explanation["threat_probability"],
        "features": [
            {
                "feature": f["feature"],
                "display_name": f["display_name"],
                "value": f.get("value", 0.0),
                "shap_value": f["shap_value"],
                "direction": f["impact_direction"],
                "rank": f["rank"]
            }
            for f in explanation["top_features"]
        ]
    }

def network_result() -> dict[str, Any]:
    # Fallback for the network graph
    # This would normally be extracted from the latest state's graph
    return {"nodes": [], "edges": [], "summary": {}, "available": False, "reason": "Graph visualization is currently in read-only mode"}

def summary() -> dict[str, Any]:
    insight = _DETECTOR.get_latest_insight()

    # Calculate progress towards first forecast
    # The World Model needs 'history_windows' states to produce its first prediction.
    windows_needed = _DETECTOR.artifact.history_windows
    windows_captured = getattr(_DETECTOR, "windows_captured", 0)

    if not insight:
        # Return a valid empty structure with a progress message
        return {
            "timestamp": None,
            "current_risk": 0.0,
            "current_prediction": f"Collecting state... ({windows_captured}/{windows_needed})",
            "confidence": 0.0,
            "forecast": [],
            "attack_progression": {"current_stage": "Initializing", "next_likely_stage": "Undetermined", "trajectory": "STABLE", "stage_scores": {}, "evidence": []},
            "explanation": {"available": False, "features": [], "reason": f"Collecting initial {windows_needed} windows of network behavior..."},
            "network_graph": {"nodes": [], "edges": [], "summary": {}, "available": False, "reason": "No data"},
            "latest_flow": None,
        }

    from .detector_service import latest_flow

    return {
        "timestamp": "Now",
        "current_risk": insight.get("progression", {}).get("current_risk", 0.0),
        "current_prediction": insight.get("progression", {}).get("current_stage", "Undetermined"),
        "confidence": 1.0,
        "forecast": forecast_rows(),
        "attack_progression": progression_result(),
        "explanation": explanation_result(),
        "network_graph": network_result(),
        "latest_flow": latest_flow(),
    }
