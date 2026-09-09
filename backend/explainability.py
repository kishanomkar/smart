"""Explainability adapter for the World Model using SHAP."""

from __future__ import annotations

from typing import Any, Callable
import numpy as np

try:
    import shap
except ImportError:
    shap = None


class ExplainabilityUnavailable(RuntimeError):
    """Raised when SHAP explainability analysis cannot be performed."""
    pass


def should_explain(threat_probability: float, explain_enabled: bool, threshold: float = 0.70, explain_all: bool = False) -> bool:
    """Determine whether an explanation should be generated for a flow."""
    if not explain_enabled:
        return False
    if explain_all:
        return True
    return float(threat_probability) >= float(threshold)


def explain_world_model_prediction(
    artifact: Any,
    current_sequence: np.ndarray,
    feature_names: list[str],
    top_k: int = 5,
) -> dict:
    """Generate SHAP-based feature importance for the next-state prediction.

    Since the World Model is an LSTM, we explain the laest prediction based on the
    input window of states.
    """
    if shap is None:
        raise ExplainabilityUnavailable("SHAP library not installed")

    # Define a wrapper for SHAP: (samples, history, dim) -> (samples, 1)
    # We want to explain the 'threat_probability' of the next state.
    # Threat prob is usually 'average_threat_probability' in the feature vector.
    try:
        threat_idx = feature_names.index("average_threat_probability")
    except ValueError:
        # Fallback to a likely index or error
        raise ValueError("Feature 'average_threat_probability' not found in feature_names")

    def model_predict(X):
        # X is [samples, history * dim]
        # Reshape to [samples, history, dim]
        history = artifact.history_windows
        dim = len(feature_names)
        X_reshaped = X.reshape(-1, history, dim)

        # Normalize
        X_norm = (X_reshaped - artifact.mean) / artifact.scale
        X_tensor = torch.from_numpy(X_norm).float()

        with torch.no_grad():
            preds = artifact.model(X_tensor).numpy() # [samples, dim]

        return preds[:, threat_idx]

    # Use KernelSHAP for model-agnostic explanation
    # current_sequence: [history, dim]
    # Flatten for SHAP
    flat_sequence = current_sequence.flatten().reshape(1, -1)

    # We need a background dataset for SHAP. Use a small sample or zeros.
    # In a real scenario, we'd use a representative sample of the training set.
    background = np.zeros((10, artifact.history_windows * len(feature_names)))

    explainer = shap.KernelExplainer(model_predict, background)
    shap_values = explainer.shap_values(flat_sequence, nsamples=100) # [1, history*dim]

    # Process SHAP values
    # shap_values is [1, history * dim]
    raw_shap = shap_values[0]

    # We aggregate SHAP values across the history window to see which feature
    # overall contributed most to the prediction.
    aggregated_shap = np.zeros(len(feature_names))
    for i in range(artifact.history_windows):
        aggregated_shap += raw_shap[i * len(feature_names) : (i + 1) * len(feature_names)]

    abs_shap = np.abs(aggregated_shap)
    order = np.argsort(abs_shap)[::-1][:top_k]

    top_features = []
    for rank_idx, idx in enumerate(order, 1):
        sv = float(aggregated_shap[idx])
        direction = "increased_risk" if sv > 0 else "decreased_risk" if sv < 0 else "neutral"

        top_features.append({
            "rank": rank_idx,
            "feature": feature_names[idx],
            "display_name": feature_names[idx],
            "shap_value": sv,
            "impact_direction": direction,
        })

    # Calculate current threat probability for the response
    # Normalize the prediction
    norm_seq = (current_sequence - artifact.mean) / artifact.scale
    with torch.no_grad():
        pred_vec = artifact.model(torch.from_numpy(norm_seq).float().unsqueeze(0)).numpy()[0]

    # Inverse normalize the threat probability
    threat_prob = (pred_vec[threat_idx] * artifact.scale[threat_idx]) + artifact.mean[threat_idx]

    return {
        "threat_probability": float(threat_prob),
        "top_features": top_features,
    }

import torch # Added for the wrapper function
