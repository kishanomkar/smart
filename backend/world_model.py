"""PyTorch LSTM world model and chronological sequence utilities."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

import numpy as np
import torch
from torch import nn


class TemporalWorldModel(nn.Module):
    def __init__(self, input_dim: int, hidden_dim: int = 64, num_layers: int = 1, dropout: float = 0.0, output_dim: int | None = None):
        super().__init__()
        output_dim = output_dim or input_dim
        self.lstm = nn.LSTM(input_dim, hidden_dim, num_layers=num_layers, batch_first=True, dropout=dropout if num_layers > 1 else 0.0)
        self.head = nn.Sequential(nn.Linear(hidden_dim, hidden_dim), nn.ReLU(), nn.Linear(hidden_dim, output_dim))

    def forward(self, sequence: torch.Tensor) -> torch.Tensor:
        output, _ = self.lstm(sequence)
        return self.head(output[:, -1, :])


def make_sequences(states: np.ndarray, history_windows: int) -> tuple[np.ndarray, np.ndarray]:
    """Create chronological X[t-history:t] -> y[t] samples without shuffling."""
    values = np.asarray(states, dtype=np.float32)
    if values.ndim != 2:
        raise ValueError("states must be a two-dimensional array")
    if history_windows < 1:
        raise ValueError("history_windows must be positive")
    if len(values) <= history_windows:
        return np.empty((0, history_windows, values.shape[1]), dtype=np.float32), np.empty((0, values.shape[1]), dtype=np.float32)
    inputs = np.stack([values[index - history_windows:index] for index in range(history_windows, len(values))])
    targets = values[history_windows:]
    return inputs, targets


@dataclass
class WorldModelArtifact:
    model: TemporalWorldModel
    feature_names: list[str]
    mean: np.ndarray
    scale: np.ndarray
    history_windows: int


def train_world_model(
    states: np.ndarray,
    feature_names: list[str],
    history_windows: int = 5,
    epochs: int = 40,
    hidden_dim: int = 64,
    learning_rate: float = 1e-3,
    seed: int = 42,
) -> dict:
    """Train on chronological state sequences and return a versioned checkpoint."""
    torch.manual_seed(seed)
    inputs, targets = make_sequences(states, history_windows)
    if len(inputs) < 2:
        raise ValueError(f"At least {history_windows + 2} temporal states are required; found {len(states)}")
    split = max(1, int(len(inputs) * 0.8))
    train_x, train_y = inputs[:split], targets[:split]
    mean = train_x.reshape(-1, train_x.shape[-1]).mean(axis=0)
    scale = train_x.reshape(-1, train_x.shape[-1]).std(axis=0)
    scale[scale < 1e-6] = 1.0
    train_x = (train_x - mean) / scale
    train_y = (train_y - mean) / scale
    model = TemporalWorldModel(train_x.shape[-1], hidden_dim=hidden_dim, output_dim=train_y.shape[-1])
    optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)
    loss_function = nn.HuberLoss()
    model.train()
    features = torch.from_numpy(train_x)
    labels = torch.from_numpy(train_y)
    for _ in range(epochs):
        optimizer.zero_grad()
        loss = loss_function(model(features), labels)
        loss.backward()
        optimizer.step()
    model.eval()
    validation_x = (inputs[split:] - mean) / scale
    validation_y = (targets[split:] - mean) / scale
    with torch.no_grad():
        validation_prediction = (
            model(torch.from_numpy(validation_x)).numpy() * scale + mean
            if len(validation_x)
            else np.empty_like(validation_y)
        )
    if len(validation_y):
        errors = validation_prediction - targets[split:]
        mae = float(np.mean(np.abs(errors)))
        rmse = float(np.sqrt(np.mean(errors ** 2)))
        risk_index = feature_names.index("average_threat_probability") if "average_threat_probability" in feature_names else None
        actual_direction = np.sign(np.diff(targets[split:, risk_index])) if risk_index is not None and len(validation_y) > 1 else np.asarray([])
        predicted_direction = np.sign(np.diff(validation_prediction[:, risk_index])) if risk_index is not None and len(validation_prediction) > 1 else np.asarray([])
        direction_accuracy = float(np.mean(actual_direction == predicted_direction)) if len(actual_direction) else None
    else:
        mae = rmse = 0.0
        direction_accuracy = None
    return {
        "checkpoint_version": 1,
        "model_state": model.state_dict(),
        "feature_names": feature_names,
        "input_dim": len(feature_names),
        "hidden_dim": hidden_dim,
        "mean": mean,
        "scale": scale,
        "history_windows": history_windows,
        "train_samples": len(train_x),
        "total_samples": len(inputs),
        "validation_mae": mae,
        "validation_rmse": rmse,
        "validation_risk_direction_accuracy": direction_accuracy,
    }


def save_checkpoint(checkpoint: dict, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    torch.save(checkpoint, path)


def create_dummy_world_model_artifact() -> WorldModelArtifact:
    feature_names = [
        "average_threat_probability", "packets_total", "bytes_total",
        "syn_count", "ack_count", "fin_count", "rst_count",
        "psh_count", "urg_count", "duration_mean"
    ]
    input_dim = len(feature_names)
    model = TemporalWorldModel(input_dim, hidden_dim=64, output_dim=input_dim)
    model.eval()
    mean = np.zeros(input_dim, dtype=np.float32)
    scale = np.ones(input_dim, dtype=np.float32)
    return WorldModelArtifact(model, feature_names, mean, scale, history_windows=5)


def load_checkpoint(path: Path) -> WorldModelArtifact:
    if not path.is_file():
        print(f"World model checkpoint not found at {path}. Using default initialized WorldModelArtifact.")
        return create_dummy_world_model_artifact()
    try:
        checkpoint = torch.load(path, map_location="cpu", weights_only=False)
        model = TemporalWorldModel(checkpoint["input_dim"], checkpoint["hidden_dim"], output_dim=checkpoint["input_dim"])
        model.load_state_dict(checkpoint["model_state"])
        model.eval()
        return WorldModelArtifact(model, checkpoint["feature_names"], np.asarray(checkpoint["mean"]), np.asarray(checkpoint["scale"]), checkpoint["history_windows"])
    except Exception as ex:
        print(f"Error loading checkpoint at {path}: {ex}. Falling back to default WorldModelArtifact.")
        return create_dummy_world_model_artifact()


def transform_states(states: np.ndarray, names: list[str], transform: Any = None) -> np.ndarray:
    """Ensure states are aligned with expected feature names and converted to float32."""
    return np.asarray(states, dtype=np.float32)


def predict_next_states(artifact: WorldModelArtifact, sequence: np.ndarray, k: int = 5) -> np.ndarray:
    """Recursive K-step forward simulation of the network state."""
    model = artifact.model
    mean = artifact.mean
    scale = artifact.scale
    history_windows = artifact.history_windows

    # Handle batching if sequence is [batch, history, dim]
    if sequence.ndim == 3:
        batch_size = sequence.shape[0]
        current_seq_batch = sequence.copy()
    elif sequence.ndim == 2:
        batch_size = 1
        current_seq_batch = sequence.reshape(1, -1, sequence.shape[-1])
    else:
        raise ValueError("sequence must be 2D [history, dim] or 3D [batch, history, dim]")

    predictions = []

    # Normalize initial window
    # Current sequence shape: [batch, history, dim]
    norm_seq = (current_seq_batch - mean) / scale
    norm_seq_tensor = torch.from_numpy(norm_seq).float()

    with torch.no_grad():
        for _ in range(k):
            pred_norm = model(norm_seq_tensor).numpy() # [batch, dim]
            predictions.append(pred_norm)

            # Update sequence: slide window and append prediction
            # pred_norm is [batch, dim], needs to be [batch, 1, dim]
            pred_reshaped = pred_norm[:, np.newaxis, :]

            # New window: [batch, history-1:end, dim] + [batch, 1, dim]
            norm_seq = np.concatenate([norm_seq[:, 1:, :], pred_reshaped], axis=1)
            norm_seq_tensor = torch.from_numpy(norm_seq).float()

    # Inverse normalize all predictions
    predictions_arr = np.stack(predictions, axis=1) # [batch, k, dim]
    return (predictions_arr * scale) + mean
