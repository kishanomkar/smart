"""Heuristic behavior-to-stage mapping for early-warning presentation."""

from __future__ import annotations


def infer_stage(state: dict[str, float]) -> str:
    """Return a possible stage; this is heuristic, not ATT&CK classification."""
    if state.get("graph_destination_diversity", 0.0) >= 3.0 or state.get("graph_new_destination_count", 0.0) >= 3.0:
        return "Reconnaissance"
    if state.get("graph_new_source_count", 0.0) >= 2.0 or state.get("unique_destination_ips", 0.0) >= 5.0:
        return "Lateral Movement"
    if state.get("bytes_total", 0.0) >= 1_000_000 and state.get("malicious_flow_ratio", 0.0) > 0.5:
        return "Exfiltration"
    if state.get("average_inter_arrival_time", 0.0) > 0.0 and state.get("average_inter_arrival_time", 0.0) < 2.0:
        return "Command and Control"
    if state.get("malicious_flow_ratio", 0.0) > 0.5:
        return "Initial Access"
    return "Undetermined"