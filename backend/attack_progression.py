"""Deterministic behavioural attack progression and high-level ATT&CK mapping."""

from __future__ import annotations

import json
from collections import deque
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

STAGES = (
    "Reconnaissance",
    "Initial Access",
    "Lateral Movement",
    "Command and Control",
    "Exfiltration",
)

DEFAULT_MAPPING_PATH = Path(__file__).resolve().parent / "config" / "attack_stage_mapping.json"


def _number(state: dict[str, Any], name: str) -> float:
    try:
        value = float(state.get(name, 0.0) or 0.0)
        return value if value == value else 0.0
    except (TypeError, ValueError):
        return 0.0


def _clip(value: float) -> float:
    return max(0.0, min(1.0, value))


def _rise(current: float, previous: dict[str, Any] | None, name: str) -> float:
    return _clip(current - _number(previous or {}, name))


def _threshold(value: float, reference: float) -> float:
    return _clip(value / reference) if reference > 0 else 0.0


@dataclass(frozen=True)
class ProgressionResult:
    timestamp: str | None
    current_risk: float
    current_stage: str
    next_likely_stage: str
    trajectory: str
    stage_scores: dict[str, float]
    supporting_evidence: list[str]
    mitre_mapping: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return {
            "timestamp": self.timestamp,
            "current_risk": self.current_risk,
            "current_stage": self.current_stage,
            "next_likely_stage": self.next_likely_stage,
            "trajectory": self.trajectory,
            "stage_scores": dict(self.stage_scores),
            "evidence": list(self.supporting_evidence),
            "mitre_mapping": self.mitre_mapping,
        }


class AttackProgressionEngine:
    """Score available network behaviour without treating scores as probabilities."""

    def __init__(self, mapping_path: Path = DEFAULT_MAPPING_PATH, history_size: int = 8):
        self.mapping = json.loads(mapping_path.read_text(encoding="utf-8")) if mapping_path.is_file() else {}
        self.transitions = self.mapping.get("transitions", {
            "Reconnaissance": ["Reconnaissance", "Initial Access", "Lateral Movement"],
            "Initial Access": ["Initial Access", "Lateral Movement", "Command and Control"],
            "Lateral Movement": ["Lateral Movement", "Command and Control", "Exfiltration"],
            "Command and Control": ["Command and Control", "Exfiltration"],
            "Exfiltration": ["Exfiltration"],
        })
        self.history: deque[dict[str, Any]] = deque(maxlen=max(2, history_size))

    def evaluate(
        self,
        state: dict[str, Any],
        predicted_states: Iterable[dict[str, Any]] = (),
        threat_trajectory: Iterable[float] = (),
        timestamp: str | None = None,
    ) -> ProgressionResult:
        previous = self.history[-1] if self.history else None
        scores, evidence = self._score(state, previous)
        self.history.append(dict(state))
        current_stage = max(scores, key=scores.get) if max(scores.values(), default=0.0) >= 0.25 else "Undetermined"
        future = list(predicted_states)
        future_scores = [self._score(item, state)[0] for item in future]
        next_stage = self._next_stage(current_stage, scores, future_scores)
        risk = _clip(max(_number(state, "average_threat_probability"), _number(state, "malicious_flow_ratio")))
        trajectory = self._trajectory(risk, previous, threat_trajectory, scores, future_scores)
        mapping = self.mapping.get(current_stage, {}) if current_stage != "Undetermined" else {}
        return ProgressionResult(timestamp, risk, current_stage, next_stage, trajectory, scores, evidence, mapping)

    def _score(self, state: dict[str, Any], previous: dict[str, Any] | None) -> tuple[dict[str, float], list[str]]:
        malicious = _clip(_number(state, "malicious_flow_ratio"))
        threat = _clip(max(_number(state, "average_threat_probability"), _number(state, "maximum_threat_probability")))
        new_dest = _threshold(_number(state, "graph_new_destination_count"), 3.0)
        new_source = _threshold(_number(state, "graph_new_source_count"), 2.0)
        dest_hosts = _threshold(_number(state, "unique_destination_ips"), 5.0)
        dest_ports = _threshold(_number(state, "unique_destination_ports"), 5.0)
        destination_growth = _rise(_number(state, "unique_destination_ips"), previous, "unique_destination_ips")
        threat_rise = _rise(threat, previous, "average_threat_probability")
        bytes_signal = _threshold(_number(state, "bytes_total"), 1_000_000.0)
        timing = _clip(_threshold(_number(state, "average_inter_arrival_time"), 2.0)) if _number(state, "average_inter_arrival_time") > 0 else 0.0
        timing_regularity = (1.0 - _clip(_number(state, "inter_arrival_time_variance") * 50.0)) if timing > 0 else 0.0
        expansion_context = max(malicious, threat, _clip(min(
            _number(state, "graph_new_source_count"),
            _number(state, "graph_new_destination_count"),
        ) / 3.0))
        discovery_context = max(threat, _clip(min(
            _number(state, "graph_new_destination_count"),
            _number(state, "unique_destination_ports"),
        ) / 3.0))
        scores = {
            "Reconnaissance": _clip(discovery_context * (0.4 * new_dest + 0.3 * dest_ports + 0.3 * destination_growth)),
            "Initial Access": _clip(0.55 * threat + 0.3 * threat_rise + 0.15 * malicious),
            "Lateral Movement": _clip(expansion_context * (0.4 * new_source + 0.3 * new_dest + 0.3 * destination_growth)),
            "Command and Control": _clip(0.6 * timing_regularity + 0.2 * timing + 0.2 * threat),
            "Exfiltration": _clip(0.65 * bytes_signal * malicious + 0.35 * threat * bytes_signal),
        }
        evidence: list[str] = []
        if new_dest > 0 or destination_growth > 0:
            evidence.append(f"New destination signal={_number(state, 'graph_new_destination_count'):.2f}; destination hosts={_number(state, 'unique_destination_ips'):.2f}")
        if new_source > 0:
            evidence.append(f"New source signal={_number(state, 'graph_new_source_count'):.2f}")
        if threat_rise > 0:
            evidence.append(f"Threat evidence rose by {threat_rise:.4f}")
        if timing > 0:
            evidence.append(f"Inter-arrival timing signal={_number(state, 'average_inter_arrival_time'):.4f}s")
        if bytes_signal > 0 and malicious > 0:
            evidence.append(f"Outbound-volume proxy bytes_total={_number(state, 'bytes_total'):.2f} with malicious ratio={malicious:.4f}")
        if not evidence:
            evidence.append("No stage-specific behavioural signal exceeded the configured evidence thresholds")
        return scores, evidence

    def _next_stage(self, current: str, current_scores: dict[str, float], future_scores: list[dict[str, float]]) -> str:
        candidates = future_scores[-1] if future_scores else current_scores
        if current == "Undetermined":
            return max(candidates, key=candidates.get) if max(candidates.values(), default=0.0) >= 0.25 else "Undetermined"
        allowed = [stage for stage in self.transitions.get(current, [current]) if stage in STAGES]
        later = [stage for stage in allowed if stage != current]
        if not later:
            return current
        candidate = max(later, key=lambda stage: candidates.get(stage, 0.0))
        return candidate if candidates.get(candidate, 0.0) >= 0.25 else current

    @staticmethod
    def _trajectory(risk: float, previous: dict[str, Any] | None, threat_trajectory: Iterable[float], scores: dict[str, float], future_scores: list[dict[str, float]]) -> str:
        future_risk = list(threat_trajectory)
        if future_risk and future_risk[-1] > risk + 0.02:
            return "ESCALATING"
        if previous is not None and risk > max(_number(previous, "average_threat_probability"), _number(previous, "malicious_flow_ratio")) + 0.02:
            return "ESCALATING"
        if future_scores and max(future_scores[-1].values()) > max(scores.values()) + 0.1:
            return "ESCALATING"
        if previous is not None and risk < max(_number(previous, "average_threat_probability"), _number(previous, "malicious_flow_ratio")) - 0.02:
            return "DE-ESCALATING"
        return "STABLE"


def evaluate_progression(state: dict[str, Any], history: Iterable[dict[str, Any]] = (), **kwargs: Any) -> dict[str, Any]:
    engine = AttackProgressionEngine()
    for item in history:
        engine.history.append(dict(item))
    return engine.evaluate(state, **kwargs).to_dict()
