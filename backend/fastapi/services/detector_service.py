from __future__ import annotations

from pathlib import Path
from typing import Any

from backend.live_detector import LiveAttackDetector

BASE_DIR = Path(__file__).resolve().parents[2]
MODEL_PATH = BASE_DIR / "models" / "world_model.pt"

# Singleton detector
_DETECTOR = LiveAttackDetector(
    model_path=MODEL_PATH,
    interface="lo",
    window_seconds=2.0,
    horizon=5
)
_DETECTOR.start()

def _flow_path() -> Path | None:
    # Maintain compatibility with existing API checks
    return BASE_DIR / "live_flows.csv" if (BASE_DIR / "live_flows.csv").is_file() else None

def latest_flow() -> dict[str, Any] | None:
    insight = _DETECTOR.get_latest_insight()
    if not insight or "current_state" not in insight:
        return None

    # Map state values back to the FlowResponse schema expected by the frontend
    state = insight["current_state"]
    return {
        "timestamp": "Now",
        "src_ip": "Network-Wide",
        "dst_ip": "Network-Wide",
        "protocol": "Mixed",
        "prediction": " laBel", # Handled by the state mapping usually
        "confidence": 1.0,
        "threat_probability": state.get("average_threat_probability", 0.0),
        "packets": state.get("packets_total", 0.0),
        "bytes": state.get("bytes_total", 0.0)
    }

def flows(limit: int = 100) -> list[dict[str, Any]]:
    # Return a list of the latest flow-like summaries from the state
    return [latest_flow()] if latest_flow() else []

def model_status() -> tuple[str, Any | None]:
    return "LOADED", _DETECTOR.artifact

def analyze_features(features: dict[str, float]) -> tuple[str, float, float, Any]:
    # Fallback for the analyze-flow endpoint
    # In the new architecture, we analyze state windows, not single flows.
    # We return a dummy response or a basic check.
    return "ANALYZING", 1.0, 0.1, features

def iso_now() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()
