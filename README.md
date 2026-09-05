# Real-time Network Intrusion Detection

This project trains a local multiclass model from CIC-IDS2017 flow records and
uses the same feature schema for live Scapy/Npcap traffic.

## Pipeline

```text
CIC CSV files -> selected reproducible features -> grouped evaluation split
		-> class-weighted Random Forest -> models/network_detector.joblib

Npcap -> Scapy packets -> bidirectional TCP/UDP flows -> shared features
	-> feature_schema.json -> local prediction -> live_flows.csv
```

The exact 79-column source schema and the direct/aggregated/unavailable mapping
are recorded in `backend/feature_mapping.md`. The model uses 69 features that
can be calculated from live packet metadata. Training and inference share
`backend/features.py`; feature order is checked against `backend/feature_schema.json`.

## Train

From the repository root:

```powershell
python backend\live_detector.py --combine
python backend\trainnew_model.py
```

Training prints the exact CSV columns, class distribution, weighted and macro
precision/recall/F1, a per-class report, and the confusion matrix. It uses
`class_weight="balanced_subsample"`. Since CIC-IDS2017 has no flow ID, the
evaluation split groups contiguous blocks of 1,000 rows to reduce local
correlation leakage; it is not a perfect cross-flow split.

## Live inference

Run PowerShell as Administrator when Npcap requires it:

```powershell
python backend\live_detector.py --flow-timeout 5 --debug
```

Each bidirectional flow is finalized after five seconds without a packet, then
its feature vector is printed with prediction, confidence, threat probability,
and model input shape. Finalized vectors and prediction metadata are appended
to `backend/live_flows.csv`. A larger timeout gives more complete long-lived
flows but delays predictions; a smaller timeout produces faster, shorter flow
records and can split one application session into multiple flows.

Only TCP and UDP IPv4/IPv6 flows are sent to the model. ARP, ICMP, and other
non-TCP/UDP packets are logged as unsupported metadata rather than being
pretended to match CIC flow features. HTTPS payload contents are not inspected.