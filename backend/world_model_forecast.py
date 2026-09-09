"""Recursive K-step simulation using the trained temporal world model."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import torch

try:
    from world_model import WorldModelArtifact
except ImportError:
    from .world_model import WorldModelArtifact


@dataclass(frozen=True)
class WorldForecastPoint:
    horizon: int
    values: dict[str, float]
    threat_probability: float
    predicted_label: str
    trend: str


def recursive_forecast(artifact: WorldModelArtifact, history: np.ndarray, horizon: int) -> list[WorldForecastPoint]:
    """Predict future states by feeding each prediction into the next step."""
    if horizon <= 0:
        raise ValueError("horizon must be positive")
    values = np.asarray(history, dtype=np.float32)
    if values.ndim != 2 or values.shape[1] != len(artifact.feature_names):
        raise ValueError("history must have shape (history_windows, state_dim)")
    if len(values) < artifact.history_windows:
        raise ValueError(f"At least {artifact.history_windows} history windows are required")
    sequence = ((values[-artifact.history_windows:] - artifact.mean) / artifact.scale).astype(np.float32)
    output: list[WorldForecastPoint] = []
    previous_risk = _threat_probability(values[-1], artifact.feature_names)
    with torch.no_grad():
        for step in range(1, horizon + 1):
            tensor = torch.from_numpy(sequence[None, ...])
            predicted = artifact.model(tensor).numpy()[0] * artifact.scale + artifact.mean
            predicted = _clip_state(predicted, artifact.feature_names)
            risk = _threat_probability(predicted, artifact.feature_names)
            label = _dominant_class(predicted, artifact.feature_names)
            trend = "ESCALATING" if risk > previous_risk + 0.02 else "DE-ESCALATING" if risk < previous_risk - 0.02 else "STABLE"
            output.append(WorldForecastPoint(step, dict(zip(artifact.feature_names, predicted.tolist())), risk, label, trend))
            sequence = np.vstack([sequence[1:], ((predicted - artifact.mean) / artifact.scale).astype(np.float32)])
            previous_risk = risk
    return output


def _threat_probability(values: np.ndarray, names: list[str]) -> float:
    index = {name: position for position, name in enumerate(names)}
    benign = values[index["benign_flow_ratio"]] if "benign_flow_ratio" in index else 0.0
    risk = values[index["average_threat_probability"]] if "average_threat_probability" in index else 1.0 - benign
    return float(np.clip(risk, 0.0, 1.0))


def _dominant_class(values: np.ndarray, names: list[str]) -> str:
    probabilities = {name.removeprefix("class_probability_"): values[index] for index, name in enumerate(names) if name.startswith("class_probability_")}
    return max(probabilities, key=probabilities.get) if probabilities else "UNKNOWN"


def _clip_state(values: np.ndarray, names: list[str]) -> np.ndarray:
    result = np.asarray(values, dtype=np.float32).copy()
    class_indexes = []
    for index, name in enumerate(names):
        if name.endswith("_ratio") or name.startswith("class_probability_") or name in {"average_threat_probability", "maximum_threat_probability", "graph_density"}:
            result[index] = np.clip(result[index], 0.0, 1.0)
        if name.startswith("class_probability_"):
            class_indexes.append(index)
    if class_indexes:
        total = float(result[class_indexes].sum())
        result[class_indexes] = result[class_indexes] / total if total > 0 else 1.0 / len(class_indexes)
    return result