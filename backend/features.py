"""Shared CIC-IDS-compatible feature engineering for training and live flows."""

from __future__ import annotations

import math
import statistics
from collections import Counter
from typing import Any, Iterable

import numpy as np


LABEL_COLUMN = "Label"
ACTIVE_IDLE_GAP_SECONDS = 1.0

# These names are copied from the current CIC-IDS2017 CSV header.
FEATURE_COLUMNS = [
    "Destination Port",
    "Flow Duration",
    "Total Fwd Packets",
    "Total Backward Packets",
    "Total Length of Fwd Packets",
    "Total Length of Bwd Packets",
    "Fwd Packet Length Max",
    "Fwd Packet Length Min",
    "Fwd Packet Length Mean",
    "Fwd Packet Length Std",
    "Bwd Packet Length Max",
    "Bwd Packet Length Min",
    "Bwd Packet Length Mean",
    "Bwd Packet Length Std",
    "Flow Bytes/s",
    "Flow Packets/s",
    "Flow IAT Mean",
    "Flow IAT Std",
    "Flow IAT Max",
    "Flow IAT Min",
    "Fwd IAT Total",
    "Fwd IAT Mean",
    "Fwd IAT Std",
    "Fwd IAT Max",
    "Fwd IAT Min",
    "Bwd IAT Total",
    "Bwd IAT Mean",
    "Bwd IAT Std",
    "Bwd IAT Max",
    "Bwd IAT Min",
    "Fwd PSH Flags",
    "Bwd PSH Flags",
    "Fwd URG Flags",
    "Bwd URG Flags",
    "Fwd Header Length",
    "Bwd Header Length",
    "Fwd Packets/s",
    "Bwd Packets/s",
    "Min Packet Length",
    "Max Packet Length",
    "Packet Length Mean",
    "Packet Length Std",
    "Packet Length Variance",
    "FIN Flag Count",
    "SYN Flag Count",
    "RST Flag Count",
    "PSH Flag Count",
    "ACK Flag Count",
    "URG Flag Count",
    "Average Packet Size",
    "Avg Fwd Segment Size",
    "Avg Bwd Segment Size",
    "Fwd Header Length.1",
    "Subflow Fwd Packets",
    "Subflow Fwd Bytes",
    "Subflow Bwd Packets",
    "Subflow Bwd Bytes",
    "Init_Win_bytes_forward",
    "Init_Win_bytes_backward",
    "act_data_pkt_fwd",
    "min_seg_size_forward",
    "Active Mean",
    "Active Std",
    "Active Max",
    "Active Min",
    "Idle Mean",
    "Idle Std",
    "Idle Max",
    "Idle Min",
]

# A mapping for every current CSV column. Features not in FEATURE_COLUMNS are
# deliberately excluded from both pipelines because Scapy metadata cannot
# reproduce them with the same CIC flow-exporter semantics.
UNAVAILABLE_COLUMNS = {
    "Flow IAT Mean": "available from packet timestamps",
    "Flow IAT Std": "available from packet timestamps",
    "Flow IAT Max": "available from packet timestamps",
    "Flow IAT Min": "available from packet timestamps",
    "CWE Flag Count": "not selected: Scapy flag semantics differ across exporters",
    "ECE Flag Count": "not selected: not consistently present in the live metadata path",
    "Down/Up Ratio": "not selected: exporter-specific definition; can be added after calibration",
    "Fwd Avg Bytes/Bulk": "bulk periods require CIC exporter semantics",
    "Fwd Avg Packets/Bulk": "bulk periods require CIC exporter semantics",
    "Fwd Avg Bulk Rate": "bulk periods require CIC exporter semantics",
    "Bwd Avg Bytes/Bulk": "bulk periods require CIC exporter semantics",
    "Bwd Avg Packets/Bulk": "bulk periods require CIC exporter semantics",
    "Bwd Avg Bulk Rate": "bulk periods require CIC exporter semantics",
}


def feature_mapping(csv_columns: Iterable[str]) -> list[dict[str, str]]:
    """Return an auditable mapping for each exact column in the CSV."""
    rows = []
    for column in csv_columns:
        if column == LABEL_COLUMN:
            rows.append({
                "cic_feature": column,
                "calculation": "training target; unavailable for live traffic",
                "available": "no",
                "source_type": "label",
                "status": "label",
            })
        elif column in FEATURE_COLUMNS:
            rows.append({
                "cic_feature": column,
                "calculation": calculation_for(column),
                "available": "yes",
                "source_type": source_type_for(column),
                "status": "selected",
            })
        else:
            rows.append({
                "cic_feature": column,
                "calculation": UNAVAILABLE_COLUMNS.get(
                    column, "not selected: no defensible packet-metadata equivalent"
                ),
                "available": "no",
                "source_type": "unavailable",
                "status": "excluded from both pipelines",
            })
    return rows


def source_type_for(column: str) -> str:
    if column in {"Destination Port", "Init_Win_bytes_forward", "Init_Win_bytes_backward"}:
        return "direct packet metadata"
    return "aggregated from packets"


def calculation_for(column: str) -> str:
    if column in {"Total Fwd Packets", "Total Backward Packets", "Subflow Fwd Packets", "Subflow Bwd Packets"}:
        return "count packets in the flow direction; subflow counts equal flow counts"
    if column in {"Total Length of Fwd Packets", "Total Length of Bwd Packets", "Subflow Fwd Bytes", "Subflow Bwd Bytes"}:
        return "sum captured IP/IPv6 packet lengths by direction"
    if column == "Flow Duration":
        return "last packet timestamp minus first packet timestamp, in microseconds"
    if "IAT" in column:
        return "statistics of timestamp differences, in microseconds, for the named direction"
    if "Packet Length" in column or column in {"Average Packet Size", "Avg Fwd Segment Size", "Avg Bwd Segment Size"}:
        return "min/max/mean/std/variance of captured IP/IPv6 lengths by named scope"
    if column in {"Flow Bytes/s", "Flow Packets/s", "Fwd Packets/s", "Bwd Packets/s"}:
        return "corresponding byte or packet count divided by duration in seconds"
    if "Flag" in column or column in {"Fwd PSH Flags", "Bwd PSH Flags", "Fwd URG Flags", "Bwd URG Flags"}:
        return "count TCP packets carrying the named flag, by direction where named"
    if column in {"Fwd Header Length", "Bwd Header Length", "Fwd Header Length.1"}:
        return "sum IP/IPv6 and TCP/UDP header bytes by direction"
    if column == "Destination Port":
        return "destination port of the first packet defining the forward direction"
    if column in {"Init_Win_bytes_forward", "Init_Win_bytes_backward"}:
        return "TCP window from the first TCP packet in the named direction; zero for UDP"
    if column == "act_data_pkt_fwd":
        return "forward TCP/UDP packets with a non-empty transport payload"
    if column == "min_seg_size_forward":
        return "minimum forward TCP/UDP header length; zero when no forward packet exists"
    if column.startswith("Active") or column.startswith("Idle"):
        return "statistics of active periods and gaps using a 1-second inactivity boundary"
    return "derived from flow packet metadata"


def _safe_values(values: Iterable[float]) -> list[float]:
    return [float(value) for value in values if math.isfinite(float(value))]


def _stats(values: Iterable[float]) -> tuple[float, float, float, float, float]:
    clean = _safe_values(values)
    if not clean:
        return 0.0, 0.0, 0.0, 0.0, 0.0
    mean = statistics.fmean(clean)
    std = statistics.pstdev(clean) if len(clean) > 1 else 0.0
    return min(clean), max(clean), mean, std, statistics.pvariance(clean) if len(clean) > 1 else 0.0


def _iat_stats(timestamps: list[float]) -> tuple[float, float, float, float, float]:
    if len(timestamps) < 2:
        return 0.0, 0.0, 0.0, 0.0, 0.0
    intervals = [max(0.0, b - a) * 1_000_000 for a, b in zip(timestamps, timestamps[1:])]
    minimum, maximum, mean, std, _ = _stats(intervals)
    return sum(intervals), mean, std, maximum, minimum


def _period_stats(timestamps: list[float]) -> tuple[tuple[float, float, float, float], tuple[float, float, float, float]]:
    if len(timestamps) < 2:
        return (0.0, 0.0, 0.0, 0.0), (0.0, 0.0, 0.0, 0.0)
    gaps = [max(0.0, b - a) for a, b in zip(timestamps, timestamps[1:])]
    active_periods = []
    idle_periods = [gap * 1_000_000 for gap in gaps if gap > ACTIVE_IDLE_GAP_SECONDS]
    active_start = timestamps[0]
    for left, right in zip(timestamps, timestamps[1:]):
        if right - left > ACTIVE_IDLE_GAP_SECONDS:
            active_periods.append((left - active_start) * 1_000_000)
            active_start = right
    active_periods.append((timestamps[-1] - active_start) * 1_000_000)
    _, active_max, active_mean, active_std, _ = _stats(active_periods)
    _, idle_max, idle_mean, idle_std, _ = _stats(idle_periods)
    return (active_mean, active_std, active_max, min(active_periods) if active_periods else 0.0), (
        idle_mean, idle_std, idle_max, min(idle_periods) if idle_periods else 0.0
    )


def _value(flow: Any, name: str, default: Any = 0) -> Any:
    if isinstance(flow, dict):
        return flow.get(name, default)
    return getattr(flow, name, default)


def flow_to_features(flow: Any) -> dict[str, float]:
    """Convert a live FlowRecord or compatible dictionary to exact CIC names."""
    forward_lengths = list(_value(flow, "forward_lengths", []))
    backward_lengths = list(_value(flow, "backward_lengths", []))
    all_lengths = forward_lengths + backward_lengths
    forward_times = list(_value(flow, "forward_timestamps", []))
    backward_times = list(_value(flow, "backward_timestamps", []))
    timestamps = sorted(forward_times + backward_times)
    f_min, f_max, f_mean, f_std, _ = _stats(forward_lengths)
    b_min, b_max, b_mean, b_std, _ = _stats(backward_lengths)
    p_min, p_max, p_mean, p_std, p_variance = _stats(all_lengths)
    duration_seconds = max(0.0, _value(flow, "last_seen", 0.0) - _value(flow, "first_seen", 0.0))
    duration_us = duration_seconds * 1_000_000
    duration_for_rate = duration_seconds if duration_seconds > 0 else 1e-6
    f_iat_total, f_iat_mean, f_iat_std, f_iat_max, f_iat_min = _iat_stats(forward_times)
    b_iat_total, b_iat_mean, b_iat_std, b_iat_max, b_iat_min = _iat_stats(backward_times)
    _, flow_iat_mean, flow_iat_std, flow_iat_max, flow_iat_min = _iat_stats(timestamps)
    active, idle = _period_stats(timestamps)
    total_forward = len(forward_lengths)
    total_backward = len(backward_lengths)
    total_packets = total_forward + total_backward
    total_forward_bytes = sum(forward_lengths)
    total_backward_bytes = sum(backward_lengths)
    flag_counts = Counter(_value(flow, "flag_counts", {}))
    forward_flags = Counter(_value(flow, "forward_flag_counts", {}))
    backward_flags = Counter(_value(flow, "backward_flag_counts", {}))
    forward_headers = sum(_value(flow, "forward_headers", []))
    backward_headers = sum(_value(flow, "backward_headers", []))
    feature_values = {
        "Destination Port": float(_value(flow, "dst_port", 0)),
        "Flow Duration": duration_us,
        "Total Fwd Packets": total_forward,
        "Total Backward Packets": total_backward,
        "Total Length of Fwd Packets": total_forward_bytes,
        "Total Length of Bwd Packets": total_backward_bytes,
        "Fwd Packet Length Max": f_max,
        "Fwd Packet Length Min": f_min,
        "Fwd Packet Length Mean": f_mean,
        "Fwd Packet Length Std": f_std,
        "Bwd Packet Length Max": b_max,
        "Bwd Packet Length Min": b_min,
        "Bwd Packet Length Mean": b_mean,
        "Bwd Packet Length Std": b_std,
        "Flow Bytes/s": (sum(all_lengths) / duration_for_rate),
        "Flow Packets/s": (total_packets / duration_for_rate),
        "Flow IAT Mean": flow_iat_mean,
        "Flow IAT Std": flow_iat_std,
        "Flow IAT Max": flow_iat_max,
        "Flow IAT Min": flow_iat_min,
        "Fwd IAT Total": f_iat_total,
        "Fwd IAT Mean": f_iat_mean,
        "Fwd IAT Std": f_iat_std,
        "Fwd IAT Max": f_iat_max,
        "Fwd IAT Min": f_iat_min,
        "Bwd IAT Total": b_iat_total,
        "Bwd IAT Mean": b_iat_mean,
        "Bwd IAT Std": b_iat_std,
        "Bwd IAT Max": b_iat_max,
        "Bwd IAT Min": b_iat_min,
        "Fwd PSH Flags": forward_flags["PSH"],
        "Bwd PSH Flags": backward_flags["PSH"],
        "Fwd URG Flags": forward_flags["URG"],
        "Bwd URG Flags": backward_flags["URG"],
        "Fwd Header Length": forward_headers,
        "Bwd Header Length": backward_headers,
        "Fwd Packets/s": total_forward / duration_for_rate,
        "Bwd Packets/s": total_backward / duration_for_rate,
        "Min Packet Length": p_min,
        "Max Packet Length": p_max,
        "Packet Length Mean": p_mean,
        "Packet Length Std": p_std,
        "Packet Length Variance": p_variance,
        "FIN Flag Count": flag_counts["FIN"],
        "SYN Flag Count": flag_counts["SYN"],
        "RST Flag Count": flag_counts["RST"],
        "PSH Flag Count": flag_counts["PSH"],
        "ACK Flag Count": flag_counts["ACK"],
        "URG Flag Count": flag_counts["URG"],
        "Average Packet Size": sum(all_lengths) / total_packets if total_packets else 0.0,
        "Avg Fwd Segment Size": total_forward_bytes / total_forward if total_forward else 0.0,
        "Avg Bwd Segment Size": total_backward_bytes / total_backward if total_backward else 0.0,
        "Fwd Header Length.1": forward_headers,
        "Subflow Fwd Packets": total_forward,
        "Subflow Fwd Bytes": total_forward_bytes,
        "Subflow Bwd Packets": total_backward,
        "Subflow Bwd Bytes": total_backward_bytes,
        "Init_Win_bytes_forward": _value(flow, "forward_initial_window", 0),
        "Init_Win_bytes_backward": _value(flow, "backward_initial_window", 0),
        "act_data_pkt_fwd": _value(flow, "forward_data_packets", 0),
        "min_seg_size_forward": min(_value(flow, "forward_segment_sizes", [0])) if _value(flow, "forward_segment_sizes", []) else 0,
        "Active Mean": active[0],
        "Active Std": active[1],
        "Active Max": active[2],
        "Active Min": active[3],
        "Idle Mean": idle[0],
        "Idle Std": idle[1],
        "Idle Max": idle[2],
        "Idle Min": idle[3],
    }
    result = {name: feature_values.get(name, 0.0) for name in FEATURE_COLUMNS}
    result = {name: float(value) if np.isfinite(value) else 0.0 for name, value in result.items()}
    return result
