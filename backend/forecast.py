"""K-step forecasting using the World Model state transition dynamics."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import numpy as np
from .world_model import WorldModelArtifact, predict_next_states


@dataclass(frozen=True)
class ForecastPoint:
    window_start: float
    horizon: int
    label: str
    threat_probability: float
    probabilities: dict[str, float]
    state_vector: np.ndarray


class WorldModelForecaster:
    """Forecast future network states using recursive World Model rollouts.

    Instead of lightweight baselines, this uses the learned P(S_t+1 | S_t)
    to simulate the network trajectory.
    """

    def __init__(self, artifact: WorldModelArtifact, window_seconds: float = 60.0, horizon: int = 5):
        if window_seconds <= 0:
            raise ValueError("window_seconds must be greater than zero")
        if horizon <= 0:
            raise ValueError("horizon must be greater than zero")

        self.artifact = artifact
        self.window_seconds = float(window_seconds)
        self.horizon = int(horizon)

    def forecast(
        self,
        current_history: np.ndarray,
        current_timestamp: float,
        classes: Iterable[str]
    ) -> list[ForecastPoint]:
        """Perform a K-step rollout from the current observed sequence.

        Args:
            current_history: Sequence of states [history_windows, dim]
            current_timestamp: Epoch of the last observed window
            classes: List of attack classes for probability mapping
        """
        # 1. Generate K-step future states
        # predicted_states shape: [1, horizon, dim]
        predicted_states = predict_next_states(self.artifact, current_history, k=self.horizon)

        # Squeeze batch dimension
        forecast_vectors = predicted_states[0] # [horizon, dim]

        class_names = list(classes)
        # Find index of class probabilities in the feature vector
        # The feature vector is: BASE + GRAPH + [class_prob_X, ...]
        # We need to find where the class probabilities start.
        feature_names = self.artifact.feature_names
        prob_start_idx = -len(class_names)

        points = []
        for step in range(1, self.horizon + 1):
            vec = forecast_vectors[step-1]

            # Extract class probabilities
            probs_vals = vec[prob_start_idx:]
            # Normalize probabilities to sum to 1 (since model is regression, not softmax)
            probs_vals = np.maximum(probs_vals, 0.0)
            total = probs_vals.sum()
            if total > 0:
                probs_vals /= total
            else:
                probs_vals = np.full(len(class_names), 1.0 / len(class_names))

            probabilities = dict(zip(class_names, probs_vals.tolist()))
            label = max(probabilities, key=probabilities.get)

            # Infiltration probability = 1 - P(BENIGN)
            benign_prob = probabilities.get("BENIGN", 0.0)
            threat_prob = 1.0 - benign_prob

            points.append(ForecastPoint(
                window_start=current_timestamp + step * self.window_seconds,
                horizon=step,
                label=label,
                threat_probability=float(threat_prob),
                probabilities=probabilities,
                state_vector=vec
            ))

        return points
