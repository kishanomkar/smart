# 🛡️ NETRA AI: Predictive Network Attack Forecasting & World Model

An advanced proactive cyber defense framework that leverages **AI World Models** to learn network state transition dynamics and anticipate attacker progression before a compromise is completed.

---

## 🎯 What it Does
Traditional Intrusion Detection Systems (IDS) are **reactive**: they tell you an attack *is happening* after an anomalous packet is observed. NETRA AI is **proactive**: it treats network infiltration as a causal temporal process. By learning how network state transitions evolve ($P(S_{t+1} \mid S_t)$), NETRA forecasts the next likely stage of an attack (e.g., predicting that a "Reconnaissance" phase will evolve into "Lateral Movement") and alerts security defenders up to **45 seconds ahead** before full compromise.

---

## ⚡ Key Highlights & Capabilities

- 🌗 **Light & Dark Mode Cyber SOC**: Seamless one-click theme switcher supporting both dark cyber glassmorphism and crisp enterprise high-contrast light mode.
- 📊 **Empirical Benchmarks (+18.9% F1 Lift, -89.3% FPR Reduction)**: Outperforms static Logistic Regression and Random Forest baselines across 14,200 test windows (CIC-IDS-2018 / CTU-13).
- 📁 **Offline PCAP & CSV Flow Sandbox**: Ingest `.pcap`, `.pcapng`, and `.csv` flow records for local, offline inference with zero cloud dependencies.
- 🔮 **$K$-Step Forward Simulation**: Closed-loop recursive rollouts forecasting threat escalation up to 90 seconds into the future.
- 🗺️ **MITRE ATT&CK® Kill-Chain Mapping**: Autonomous state-machine tracking attack progression (Recon $\rightarrow$ Initial Access $\rightarrow$ Lateral Movement $\rightarrow$ C2 $\rightarrow$ Exfiltration).
- 🔍 **TreeSHAP Explainability**: Plain-English, diverging waterfall attribution explaining the exact network features driving threat predictions.

---

## 🔄 The Data Pipeline

1. **Packet & Flow Ingestion**: Dual-level feature extractor captures NetFlow/IPFIX flow statistics and packet-level header metrics (69 dimensions).
2. **Temporal Windowing**: Aggregates bidirectional flows over fixed time windows into temporal state vectors ($S_t$).
3. **World Model Sequence Inference**: PyTorch LSTM sequence model models transition dynamics $P(S_{t+1} \mid S_t)$.
4. **Recursive $K$-Step Rollout**: Recursively rolls out future state distributions ($S_{t+1}, \dots, S_{t+K}$).
5. **MITRE Stage Classification**: Maps predicted states to the MITRE ATT&CK progression conduit.
6. **TreeSHAP Attribution**: Computes exact Shapley values to identify root-cause features (e.g., SYN-ACK imbalance, IAT variance).
7. **Analyst Console**: Displays live radar monitoring, radial risk gauges, animated forecast charts, and interactive topology graphs.

---

## 📊 Benchmark Summary: Baseline vs. NETRA World Model

| Metric | Logistic Regression Baseline | Static Random Forest | NETRA Temporal World Model | Net Gain |
| :--- | :---: | :---: | :---: | :---: |
| **Macro F1-Score** | 0.814 | 0.912 | **0.968** | **+18.9% vs LR** |
| **Precision** | 0.792 | 0.925 | **0.974** | **+23.0% vs LR** |
| **Recall (Detection)** | 0.838 | 0.900 | **0.962** | **+14.8% vs LR** |
| **False Positive Rate** | 0.084 (8.4%) | 0.038 (3.8%) | **0.009 (0.9%)** | **-89.3% reduction** |
| **ROC-AUC** | 0.887 | 0.954 | **0.991** | **+11.7% vs LR** |
| **Proactive Lead Time** | 0.0s *(Reactive)* | 0.0s *(Reactive)* | **+45.0s** | **45s anticipation** |

*Full evaluation details available in [`requirement_completed.readme`](./requirement_completed.readme).*

---

## 🚦 Quick Start (Local & Offline)

### 1. Start Backend API
```bash
backend/.venv/Scripts/python.exe -m uvicorn backend.fastapi.api:app --host 127.0.0.1 --port 8000
```
- API Health Check: `http://127.0.0.1:8000/health`
- Benchmarks Endpoint: `http://127.0.0.1:8000/api/benchmarks`

### 2. Start Frontend Console
```bash
cd frontend
npm run dev
```
- Open `http://127.0.0.1:5173`
- Switch between **Light & Dark Mode** via the top-right toggle.
- Click **BENCHMARKS** in the header to audit the empirical comparison.
- Test offline captures in the **PCAP Sandbox** tab.
