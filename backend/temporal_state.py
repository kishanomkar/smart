"""Deterministic fixed-size temporal network state construction."""

from __future__ import annotations

import csv
import json
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

import numpy as np

try:
    from relationship_graph import GRAPH_FEATURE_NAMES, WindowGraph, build_relationship_graph
except ImportError:
    from .relationship_graph import GRAPH_FEATURE_NAMES, WindowGraph, build_relationship_graph


BASE_STATE_FEATURE_NAMES = [
    "flow_count",
    "benign_flow_ratio",
    "malicious_flow_ratio",
    "average_threat_probability",
    "maximum_threat_probability",
    "packets_total",
    "bytes_total",
    "average_packets_per_flow",
    "average_bytes_per_flow",
    "average_flow_duration",
    "average_inter_arrival_time",
    "inter_arrival_time_variance",
    "unique_source_ips",
    "unique_destination_ips",
    "unique_source_ports",
    "unique_destination_ports",
    "tcp_ratio",
    "udp_ratio",
    "syn_ratio",
    "ack_ratio",
    "rst_ratio",
    "fin_ratio",
]


@dataclass
class TemporalState:
    timestamp: float
    window_id: int
    values: dict[str, float]
    attack_distribution: dict[str, float]
    graph: WindowGraph

    @property
    def vector(self) -> np.ndarray:
        return np.asarray([self.values[name] for name in self.values], dtype=np.float32)


def state_feature_names(classes: Iterable[str]) -> list[str]:
    return BASE_STATE_FEATURE_NAMES + GRAPH_FEATURE_NAMES + [f"class_probability_{label}" for label in classes]


def _number(record: dict[str, Any], name: str, default: float = 0.0) -> float:
    try:
        return float(record.get(name, default) or default)
    except (TypeError, ValueError):
        return default


def build_temporal_state(
    flow_results: Iterable[dict[str, Any]],
    window_id: int,
    window_start: float,
    classes: Iterable[str],
    previous_nodes: set[str] | None = None,
) -> TemporalState:
    """Aggregate completed flow results into one reproducible state vector."""
    records = list(flow_results)
    class_names = list(classes)
    count = len(records)
    durations = [_number(record, "flow_duration") for record in records]
    timestamps = sorted(_number(record, "timestamp_epoch", window_start) for record in records)
    gaps = np.diff(timestamps) if len(timestamps) > 1 else np.asarray([], dtype=float)
    labels = Counter(str(record.get("prediction", "BENIGN")) for record in records)
    threat_values = [_number(record, "threat_probability") for record in records]
    packets = [_number(record, "packets") for record in records]
    bytes_values = [_number(record, "bytes") for record in records]
    protocol_counts = Counter(str(record.get("protocol", "")).upper() for record in records)
    flag_totals = {
        name: sum(_number(record, f"{flag} Flag Count") for record in records)
        for name, flag in (("syn_ratio", "SYN"), ("ack_ratio", "ACK"), ("rst_ratio", "RST"), ("fin_ratio", "FIN"))
    }
    flow_count = max(1, count)
    graph = build_relationship_graph(records, window_id, previous_nodes)
    attack_distribution = {
        label: (
            float(np.mean([_number(record, f"probability_{label}") for record in records]))
            if any(f"probability_{label}" in record for record in records)
            else labels.get(label, 0) / flow_count
        )
        for label in class_names
    }
    distribution_total = sum(attack_distribution.values())
    if distribution_total > 0:
        attack_distribution = {label: value / distribution_total for label, value in attack_distribution.items()}
    values = {
        "flow_count": float(count),
        "benign_flow_ratio": labels.get("BENIGN", 0) / flow_count,
        "malicious_flow_ratio": 1.0 - labels.get("BENIGN", 0) / flow_count,
        "average_threat_probability": float(np.mean(threat_values)) if threat_values else 0.0,
        "maximum_threat_probability": max(threat_values, default=0.0),
        "packets_total": sum(packets),
        "bytes_total": sum(bytes_values),
        "average_packets_per_flow": sum(packets) / flow_count,
        "average_bytes_per_flow": sum(bytes_values) / flow_count,
        "average_flow_duration": float(np.mean(durations)) if durations else 0.0,
        "average_inter_arrival_time": float(np.mean(gaps)) if len(gaps) else 0.0,
        "inter_arrival_time_variance": float(np.var(gaps)) if len(gaps) else 0.0,
        "unique_source_ips": float(len({str(record.get("src_ip", "")) for record in records})),
        "unique_destination_ips": float(len({str(record.get("dst_ip", "")) for record in records})),
        "unique_source_ports": float(len({record.get("src_port") for record in records})),
        "unique_destination_ports": float(len({record.get("dst_port") for record in records})),
        "tcp_ratio": protocol_counts.get("TCP", 0) / flow_count,
        "udp_ratio": protocol_counts.get("UDP", 0) / flow_count,
        **{name: value / flow_count for name, value in flag_totals.items()},
        **graph.summary,
        **{f"class_probability_{label}": attack_distribution[label] for label in class_names},
    }
    return TemporalState(window_start, window_id, values, attack_distribution, graph)


def write_temporal_state(path: Path, state: TemporalState, feature_names: list[str]) -> None:
    """Append a state in a CSV format suitable for chronological training."""
    path.parent.mkdir(parents=True, exist_ok=True)
    row = {
        "timestamp": state.timestamp,
        "window_id": state.window_id,
        "attack_distribution": json.dumps(state.attack_distribution, sort_keys=True),
        **{name: state.values.get(name, 0.0) for name in feature_names},
    }
    with path.open("a", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(row))
        if handle.tell() == 0:
            writer.writeheader()
        writer.writerow(row)


class TemporalStateAccumulator:
    """Bounded in-memory window accumulator for live flow results."""

    def __init__(self, window_seconds: float, classes: Iterable[str], max_history: int = 256):
        if window_seconds <= 0:
            raise ValueError("window_seconds must be greater than zero")
        self.window_seconds = float(window_seconds)
        self.classes = list(classes)
        self.max_history = max(2, int(max_history))
        self._window_id: int | None = None
        self._records: list[dict[str, Any]] = []
        self._previous_nodes: set[str] = set()
        self.states: list[TemporalState] = []

    @property
    def feature_names(self) -> list[str]:
        return state_feature_names(self.classes)

    def observe(self, record: dict[str, Any]) -> TemporalState | None:
        timestamp = float(record.get("timestamp_epoch", 0.0))
        window_id = int(timestamp // self.window_seconds)
        if self._window_id is None:
            self._window_id = window_id
        if window_id != self._window_id:
            state = self.flush()
            self._window_id = window_id
            self._records = []
        else:
            state = None
        self._records.append(record)
        return state

    def flush(self) -> TemporalState | None:
        if self._window_id is None or not self._records:
            return None
        state = build_temporal_state(
            self._records,
            self._window_id,
            self._window_id * self.window_seconds,
            self.classes,
            self._previous_nodes,
        )
        self._previous_nodes.update(state.graph.graph.nodes)
        self.states.append(state)
        if len(self.states) > self.max_history:
            self.states.pop(0)
        self._records = []
        return state