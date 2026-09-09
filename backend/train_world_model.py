"""Train the LSTM world model from chronologically exported live flows."""

from __future__ import annotations

import argparse
import csv
from collections import defaultdict
from datetime import datetime
from pathlib import Path

import numpy as np

try:
    from temporal_state import build_temporal_state, state_feature_names
    from world_model import save_checkpoint, train_world_model
except ImportError:
    from .temporal_state import build_temporal_state, state_feature_names
    from .world_model import save_checkpoint, train_world_model


BASE_DIR = Path(__file__).resolve().parent
DEFAULT_FLOW_PATH = BASE_DIR / "live_flows.csv"
DEFAULT_CHECKPOINT = BASE_DIR / "models" / "world_model.pt"


def read_flow_rows(path: Path) -> list[dict]:
    if not path.is_file() or path.stat().st_size == 0:
        legacy_path = path.with_name("live_flows.csv")
        if path.name == "live_flows_v2.csv" and legacy_path.is_file():
            print(f"Enriched export not found; migrating legacy rows from {legacy_path}")
            path = legacy_path
        else:
            raise FileNotFoundError(
                f"Flow export not found: {path}. Run live detection first to create it."
            )
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        fieldnames = reader.fieldnames or []
        rows = list(reader)
    if "timestamp_epoch" in fieldnames:
        return rows
    print("Warning: legacy rows have no per-class probabilities; using predicted labels for class distribution.")
    migrated = []
    for row in rows:
        try:
            row["timestamp_epoch"] = datetime.fromisoformat(row["timestamp"]).timestamp()
        except (KeyError, TypeError, ValueError):
            continue
        row["packets"] = float(row.get("Total Fwd Packets", 0) or 0) + float(row.get("Total Backward Packets", 0) or 0)
        row["bytes"] = float(row.get("Total Length of Fwd Packets", 0) or 0) + float(row.get("Total Length of Bwd Packets", 0) or 0)
        row["flow_duration"] = float(row.get("Flow Duration", 0) or 0) / 1_000_000.0
        migrated.append(row)
    return migrated


def build_states_from_flows(rows: list[dict], window_seconds: float, classes: list[str]) -> tuple[np.ndarray, list[str]]:
    grouped = defaultdict(list)
    for row in rows:
        try:
            timestamp = float(row.get("timestamp_epoch", 0.0))
        except (TypeError, ValueError):
            continue
        grouped[int(timestamp // window_seconds)].append(row)
    names = state_feature_names(classes)
    states = []
    for window_id in sorted(grouped):
        state = build_temporal_state(grouped[window_id], window_id, window_id * window_seconds, classes)
        states.append([state.values[name] for name in names])
    if not states:
        raise ValueError("No valid timestamped flow rows were found")
    return np.asarray(states, dtype=np.float32), names


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the chronological LSTM network world model.")
    parser.add_argument("--flows", type=Path, default=DEFAULT_FLOW_PATH)
    parser.add_argument("--output", type=Path, default=DEFAULT_CHECKPOINT)
    parser.add_argument("--window-seconds", type=float, default=60.0)
    parser.add_argument("--history-windows", type=int, default=5)
    parser.add_argument("--epochs", type=int, default=40)
    arguments = parser.parse_args()
    rows = read_flow_rows(arguments.flows)
    labels = sorted({str(row.get("prediction", "BENIGN")) for row in rows})
    states, names = build_states_from_flows(rows, arguments.window_seconds, labels)
    try:
        checkpoint = train_world_model(states, names, arguments.history_windows, arguments.epochs)
    except ValueError as error:
        raise SystemExit(f"ERROR: {error}. Continue capture until more chronological windows are available.") from error
    save_checkpoint(checkpoint, arguments.output)
    print(f"Saved world model: {arguments.output}")
    print(f"States: {len(states)}  Features: {len(names)}  Classes: {labels}")
    print(f"Chronological train samples: {checkpoint['train_samples']} / {checkpoint['total_samples']}")
    print(f"Validation MAE: {checkpoint['validation_mae']:.6f}")
    print(f"Validation RMSE: {checkpoint['validation_rmse']:.6f}")
    print(f"Risk direction accuracy: {checkpoint['validation_risk_direction_accuracy']}")


if __name__ == "__main__":
    main()