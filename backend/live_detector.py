"""Real-time network traffic capture and attack forecasting pipeline."""

from __future__ import annotations

import threading
from pathlib import Path
from typing import Any

import numpy as np
from scapy.all import sniff

from .flow_engine import FlowAggregator
from .features import flow_to_features
from .temporal_state import TemporalStateAccumulator
from .world_model import load_checkpoint
from .forecast import WorldModelForecaster
from .attack_progression import AttackProgressionEngine
from .explainability import explain_world_model_prediction


class LiveAttackDetector:
    """Orchestrates the pipeline: Capture -> Features -> World Model -> MITRE Mapping."""

    def __init__(
        self,
        model_path: Path,
        interface: str = "eth0",
        window_seconds: float = 10.0,
        horizon: int = 5,
        classes: list[str] = None
    ):
        self.interface = interface
        self.window_seconds = window_seconds
        self.horizon = horizon
        self.classes = ["BENIGN", "DoS GoldenEye", "DoS Hulk", "DoS Slowhttptest", "DoS slowloris", "Heartbleed"]

        # 1. Load the World Model and Forecaster
        self.artifact = load_checkpoint(model_path)
        self.forecaster = WorldModelForecaster(self.artifact, window_seconds, horizon)
        self.progression_engine = AttackProgressionEngine()

        # 2. Flow Aggregator and State Accumulator
        self.aggregator = FlowAggregator(timeout_seconds=window_seconds)
        self.accumulator = TemporalStateAccumulator(window_seconds, self.classes)

        self.is_running = False
        self._lock = threading.Lock()
        self.latest_result = {}
        self.windows_captured = 0

    def _packet_callback(self, pkt):
        """Process each captured packet."""
        # 1. Aggregate packet into a flow
        flow = self.aggregator.add_packet(pkt)

        # 2. Check for expired flows to process as a window
        # In a real live system, we might call expire() periodically.
        # For the prototype, we'll check if the accumulator needs a new window.
        # We use a simplified trigger: if the packet timestamp marks a new window.
        import time
        now = time.time()

        # Normally we'd only process flows that have 'finished' or 'timed out'.
        # Here we periodically flush the aggregator into the accumulator.
        expired_flows = self.aggregator.expire(now=now)

        # Convert expired flows to feature vectors and add to accumulator
        # The accumulator expects 'flow results' (dicts with prediction, etc.)
        processed_flows = []
        for f in expired_flows:
            features = flow_to_features(f)
            # For the prototype, we'd normally have a static classifier here:
            # flow_pred = classifier.predict(features)
            # For now, we simulate the classifier's output:
            record = {
                **features,
                "timestamp_epoch": f.last_seen,
                "prediction": "BENIGN",
                "threat_probability": 0.1,
                **{f"probability_{c}": 0.0 for c in self.classes if c != "BENIGN"},
                "probability_BENIGN": 0.9
            }
            processed_flows.append(record)

        # Since the accumulator.observe takes one record at a time, we loop
        # This is a bit inefficient; in production we'd add a batch_observe.
        with self._lock:
            # We only process if we actually have flows
            if processed_flows:
                # Use the first flow's timestamp for the window
                timestamp = processed_flows[0]["timestamp_epoch"]

                # Note: TemporalStateAccumulator.observe is designed for 1-by-1
                # We'll manually trigger the state build for the batch
                # to avoid calling observe() 1000 times.
                from .temporal_state import build_temporal_state
                state = build_temporal_state(
                    processed_flows,
                    int(timestamp // self.window_seconds),
                    int(timestamp // self.window_seconds) * self.window_seconds,
                    self.classes
                )
                self.accumulator.states.append(state)
                if len(self.accumulator.states) > self.accumulator.max_history:
                    self.accumulator.states.pop(0)

                self._process_completed_window(state)

    def _process_completed_window(self, state):
        """World Model Pipeline: State -> Forecast -> Progression -> Explanation."""
        self.windows_captured += 1
        print(f"Window {self.windows_captured} completed. Processing World Model rollout...")

        # 1. Get the recent history for the world model
        history = self.accumulator.states[-self.artifact.history_windows:]
        if len(history) < self.artifact.history_windows:
            print(f"  -> Need more history ({len(history)}/{self.artifact.history_windows}). Skipping forecast.")
            return

        print(f"  -> History sufficient. Generating {self.horizon}-step forecast...")
        seq = np.stack([s.vector for s in history])

        # 2. Forecast future states
        forecast_points = self.forecaster.forecast(
            current_history=seq,
            current_timestamp=state.timestamp,
            classes=self.classes
        )

        # 3. Map to MITRE stages via Progression Engine
        future_states_dicts = [
            {name: val for name, val in zip(self.artifact.feature_names, p.state_vector)}
            for p in forecast_points
        ]

        progression = self.progression_engine.evaluate(
            state=state.values,
            predicted_states=future_states_dicts,
            timestamp=str(state.timestamp)
        )

        # 4. Explain the current transition
        explanation = explain_world_model_prediction(
            artifact=self.artifact,
            current_sequence=seq,
            feature_names=self.artifact.feature_names
        )

        print(f"  -> Forecast complete. Predicted Stage: {progression.to_dict().get('current_stage')}")

        self.latest_result = {
            "current_state": state.values,
            "forecast": [p.__dict__ for p in forecast_points],
            "progression": progression.to_dict(),
            "explanation": explanation
        }

    def start(self):
        # Auto-detect interface on Windows if eth0 fails
        import platform
        if platform.system() == "Windows":
            from scapy.all import get_if_list
            ifaces = get_if_list()
            if self.interface not in ifaces:
                # Try to find a common Windows interface name
                for candidate in ["Ethernet", "Wi-Fi", "Local Area Connection"]:
                    if candidate in ifaces:
                        print(f"Interface {self.interface} not found. Switching to {candidate}")
                        self.interface = candidate
                        break
                if self.interface not in ifaces:
                    # Just pick the first available one if nothing matches
                    self.interface = ifaces[0] if ifaces else "lo"
                    print(f"Using detected interface: {self.interface}")

        self.is_running = True
        print(f"Starting live capture on {self.interface}...")
        self._sniff_thread = threading.Thread(
            target=lambda: sniff(iface=self.interface, prn=self._packet_callback, store=0),
            daemon=True
        )
        self._sniff_thread.start()

    def stop(self):
        self.is_running = False
        print("Stopping capture...")

    def inject_packet(self, src: str, dst: str, dport: int, flags: str):
        """Manually inject a packet into the pipeline for simulation."""
        from scapy.all import IP, TCP
        pkt = IP(src=src, dst=dst)/TCP(dport=dport, flags=flags)
        self._packet_callback(pkt)

    def get_latest_insight(self) -> dict:
        with self._lock:
            return self.latest_result
