"""Evaluate a saved temporal world model on chronological flow windows."""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np

try:
    from train_world_model import build_states_from_flows, read_flow_rows
    from world_model import (
        evaluate_normalized_predictions, evaluate_predictions, load_checkpoint,
        make_sequences, predict_next_states, transform_states,
    )
except ImportError:
    from .train_world_model import build_states_from_flows, read_flow_rows
    from .world_model import (
        evaluate_normalized_predictions, evaluate_predictions, load_checkpoint,
        make_sequences, predict_next_states, transform_states,
    )


BASE_DIR = Path(__file__).resolve().parent


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate next-state predictions from a saved LSTM world model.")
    parser.add_argument("--flows", type=Path, default=BASE_DIR / "live_flows.csv")
    parser.add_argument("--model", type=Path, default=BASE_DIR / "models" / "world_model.pt")
    parser.add_argument("--window-seconds", type=float, default=60.0)
    arguments = parser.parse_args()

    artifact = load_checkpoint(arguments.model)
    rows = read_flow_rows(arguments.flows)
    classes = [name.removeprefix("class_probability_") for name in artifact.feature_names if name.startswith("class_probability_")]
    states, names = build_states_from_flows(rows, arguments.window_seconds, classes)
    if names != artifact.feature_names:
        raise ValueError("Flow-derived state feature order does not match the checkpoint metadata")
    inputs, targets = make_sequences(states, artifact.history_windows)
    if len(inputs) < 3:
        raise ValueError(f"At least {artifact.history_windows + 3} temporal states are required for evaluation; found {len(states)}")
    train_end = max(1, int(len(inputs) * 0.7))
    validation_end = min(max(train_end + 1, int(len(inputs) * 0.85)), len(inputs) - 1)
    for label, start, end in (
        ("validation", train_end, validation_end),
        ("test", validation_end, len(inputs)),
    ):
        predictions = predict_next_states(artifact, inputs[start:end])
        metrics = evaluate_predictions(targets[start:end], predictions, names)
        transformed_targets = (transform_states(targets[start:end], names, artifact.transform) - artifact.mean) / artifact.scale
        transformed_predictions = (transform_states(predictions, names, artifact.transform) - artifact.mean) / artifact.scale
        normalized_metrics = evaluate_normalized_predictions(transformed_targets, transformed_predictions, names)
        print(f"{label} samples: {end - start}")
        print(f"{label} normalized MAE: {normalized_metrics['mae']}")
        print(f"{label} normalized RMSE: {normalized_metrics['rmse']}")
        print(f"{label} MAE: {metrics['mae']}")
        print(f"{label} RMSE: {metrics['rmse']}")
        print(f"{label} threat MAE: {metrics['threat_mae']}")
        print(f"{label} threat RMSE: {metrics['threat_rmse']}")


if __name__ == "__main__":
    main()
