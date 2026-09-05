"""Live Scapy flow aggregation and local CIC-compatible model inference."""

from __future__ import annotations

import argparse
import csv
import glob
import json
import os
import sys
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from scapy.all import sniff

try:
    from features import FEATURE_COLUMNS, flow_to_features
    from flow_engine import FlowAggregator, FlowRecord
except ImportError:
    from .features import FEATURE_COLUMNS, flow_to_features
    from .flow_engine import FlowAggregator, FlowRecord

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "newdata"
DATASET_PATH = BASE_DIR / "combined_cicids2017.csv"
MODEL_PATH = BASE_DIR / "models" / "network_detector.joblib"
SCHEMA_PATH = BASE_DIR / "feature_schema.json"
DEFAULT_EXPORT_PATH = BASE_DIR / "live_flows.csv"


def combine_dataset() -> None:
    files = sorted(glob.glob(str(DATA_DIR / "*.csv")))
    print(f"Found {len(files)} CSV files in {DATA_DIR}")
    if not files:
        raise FileNotFoundError(f"No CSV files found in {DATA_DIR}")
    dataframes = []
    for file in files:
        print(f"Loading: {os.path.basename(file)}")
        frame = pd.read_csv(file)
        frame.columns = frame.columns.str.strip()
        dataframes.append(frame)
    combined = pd.concat(dataframes, ignore_index=True)
    print(f"Combined dataset: {combined.shape}")
    if "Label" in combined:
        print(combined["Label"].value_counts().to_string())
    combined.to_csv(DATASET_PATH, index=False)
    print(f"Saved: {DATASET_PATH}")


def packet_summary(packet) -> str:
    layers = [layer.name for layer in packet.layers()]
    return f"time={getattr(packet, 'time', 'unknown')} size={len(packet)} layers={layers}"


def load_model():
    if not MODEL_PATH.is_file() or not SCHEMA_PATH.is_file():
        raise FileNotFoundError(
            "Model artifacts are missing. Run `python trainnew_model.py` first; "
            f"expected {MODEL_PATH} and {SCHEMA_PATH}."
        )
    artifact = joblib.load(MODEL_PATH)
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    model = artifact["model"] if isinstance(artifact, dict) else artifact
    model_features = artifact.get("feature_columns", []) if isinstance(artifact, dict) else []
    schema_features = schema.get("feature_columns", [])
    if model_features != FEATURE_COLUMNS or schema_features != FEATURE_COLUMNS:
        raise ValueError("Model, feature_schema.json, and live feature code do not have identical feature order.")
    return model


class LiveDetector:
    def __init__(self, model, flow_timeout: float, export_path: Path, debug: bool):
        self.model = model
        self.aggregator = FlowAggregator(flow_timeout)
        self.export_path = export_path
        self.debug = debug
        self.export_path.parent.mkdir(parents=True, exist_ok=True)
        self.export_file = self.export_path.open("a", newline="", encoding="utf-8")
        self.writer = None

    def close(self) -> None:
        for flow in self.aggregator.expire(force=True):
            self.predict(flow)
        self.export_file.close()

    def process_packet(self, packet) -> None:
        if self.debug:
            print(f"[PACKET] {packet_summary(packet)}")
            print(packet.show(dump=True))
        for flow in self.aggregator.expire():
            self.predict(flow)
        flow = self.aggregator.add_packet(packet)
        if flow is None:
            if self.debug:
                print("[PACKET] ignored: not an IPv4/IPv6 TCP/UDP flow")
            return
        if self.debug:
            print(f"[FLOW] active={flow.key} packets={flow.packets} bytes={flow.bytes}")

    def predict(self, flow: FlowRecord) -> None:
        features = flow_to_features(flow)
        model_input = pd.DataFrame([[features[name] for name in FEATURE_COLUMNS]], columns=FEATURE_COLUMNS)
        model_input = model_input.replace([np.inf, -np.inf], np.nan).fillna(0.0)
        prediction = self.model.predict(model_input)[0]
        probabilities = self.model.predict_proba(model_input)[0]
        confidence = float(np.max(probabilities))
        classes = list(self.model.classes_)
        benign_probability = float(probabilities[classes.index("BENIGN")]) if "BENIGN" in classes else 0.0
        threat_probability = 1.0 - benign_probability
        timestamp = datetime.now().strftime("%H:%M:%S")
        print("\n" + "=" * 72)
        print(f"[{timestamp}]")
        print(f"Flow: {flow.src_ip}:{flow.src_port} -> {flow.dst_ip}:{flow.dst_port}")
        print(f"Protocol: {flow.protocol}")
        print(f"Packets: {flow.packets}  Bytes: {flow.bytes}  Duration: {flow.last_seen - flow.first_seen:.6f}s")
        print(f"Threat probability: {threat_probability:.4f}")
        print(f"Prediction: {prediction}")
        print(f"Confidence: {confidence:.4f}")
        print(f"Model input shape: {model_input.shape}")
        if self.debug:
            print("[FEATURES]")
            for name in FEATURE_COLUMNS:
                print(f"  {name}: {features[name]}")
        self.write_export(flow, features, prediction, threat_probability, confidence)

    def write_export(self, flow, features, prediction, threat_probability, confidence) -> None:
        metadata = {
            "timestamp": datetime.now().isoformat(timespec="seconds"),
            "src_ip": flow.src_ip,
            "dst_ip": flow.dst_ip,
            "src_port": flow.src_port,
            "dst_port": flow.dst_port,
            "protocol": flow.protocol,
            "prediction": prediction,
            "threat_probability": threat_probability,
            "confidence": confidence,
        }
        row = {**metadata, **features}
        if self.writer is None:
            self.writer = csv.DictWriter(self.export_file, fieldnames=list(row))
            if self.export_file.tell() == 0:
                self.writer.writeheader()
        self.writer.writerow(row)
        self.export_file.flush()


def parse_args():
    parser = argparse.ArgumentParser(description="Capture Scapy traffic, aggregate flows, and run local NIDS inference.")
    parser.add_argument("--combine", action="store_true", help="Combine backend/newdata CSV files and exit.")
    parser.add_argument("-i", "--interface", help="Npcap interface name.")
    parser.add_argument("-f", "--filter", dest="capture_filter", help="BPF filter, for example 'tcp or udp'.")
    parser.add_argument("-c", "--count", type=int, default=0, help="Stop after this many packets; 0 means Ctrl+C.")
    parser.add_argument("--flow-timeout", type=float, default=5.0, help="Finalize flows after this many inactive seconds.")
    parser.add_argument("--export", type=Path, default=DEFAULT_EXPORT_PATH, help="CSV path for finalized live flow features.")
    parser.add_argument("--debug", action="store_true", help="Print packet, flow, feature, and model-input details.")
    return parser.parse_args()


def main() -> None:
    arguments = parse_args()
    if arguments.combine:
        combine_dataset()
        return
    model = load_model()
    detector = LiveDetector(model, arguments.flow_timeout, arguments.export, arguments.debug)
    sniff_kwargs = {"prn": detector.process_packet, "store": False}
    if arguments.interface:
        sniff_kwargs["iface"] = arguments.interface
    if arguments.capture_filter:
        sniff_kwargs["filter"] = arguments.capture_filter
    if arguments.count:
        sniff_kwargs["count"] = arguments.count
    print(f"Starting live flow detection; timeout={arguments.flow_timeout}s")
    print(f"Exporting finalized flows to {arguments.export}")
    try:
        sniff(**sniff_kwargs)
    except PermissionError:
        print("Permission denied. Run PowerShell as Administrator with Npcap installed.")
    except OSError as error:
        print(f"Unable to capture packets: {error}")
    except KeyboardInterrupt:
        print("\nCapture stopped.")
    finally:
        detector.close()
        unsupported = detector.aggregator.unsupported_packets
        if unsupported:
            print(f"Ignored non-TCP/UDP packets: {dict(unsupported)}")


if __name__ == "__main__":
    try:
        main()
    except (FileNotFoundError, ValueError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
