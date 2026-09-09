# Start Manual: AI Network Attack Forecasting System

This guide provides step-by-step instructions to launch the full-stack AI World Model system from scratch and verify that it can forecast network attack stages.

## 📋 Prerequisites
- **Python 3.10+**
- **Node.js (v18+) & npm**
- **Git**
- **Windows Users ONLY**: You must have **Npcap** installed for network packet capture to work. 
  - Download it here: [https://npcap.com/#download](https://npcap.com/#download)
  - *Note: During installation, ensure "Install Npcap in WinPcap API-compatible Mode" is checked.*
- **macOS/Linux**: No additional driver is required.

---

## 🚀 Step-by-Step Execution

### 1. Backend Setup & Launch
The backend runs a FastAPI server that orchestrates the packet capture pipeline and the PyTorch World Model.

```bash
# Navigate to the project root
cd "C:\Users\Hp\Desktop\machine apis\smart"

# Install Python dependencies
pip install -r requirements.txt

# Start the backend as a module (to ensure correct imports)
export PYTHONPATH=$PYTHONPATH:.
python -m backend.fastapi.main
```
*Keep this terminal open. You should see "Uvicorn running on http://0.0.0.0:8000".*

### 2. Frontend Setup & Launch
The frontend provides the analyst dashboard for visualizing risk and forecasts.

```bash
# Open a NEW terminal
cd "C:\Users\Hp\Desktop\machine apis\smart\frontend"

# Install Node dependencies
npm install

# Start the development server
npm run dev
```
*The terminal will provide a URL (usually `http://localhost:5173`). Open this in your browser.*

---

## 🔍 Verifying the AI World Model (The "Warm-up" Phase)

When you first open the dashboard, you will see:
**"Collecting state... (0/5)"**

**Why?** The World Model is a temporal LSTM. It cannot predict the future until it has a history of at least **5 consecutive time windows** of network behavior.

### How to trigger a result:
You can either wait for natural traffic or use the simulation script to "fast-forward" the warm-up.

1. **Open a THIRD terminal.**
2. **Run the simulation script:**
   ```bash
   python simulate_traffic.py
   ```
3. **Wait for the script to finish.** It will send bursts of packets and then pause for a few seconds between each window to allow the backend to "expire" the flows and process the state.
   - *Wait time:* The script takes approximately **15-20 seconds** to complete the 5-window cycle.

### 🏁 Final Result
Once the simulation completes, refresh your browser or check the dashboard.
- The status will change from **"Collecting state..."** to a specific attack stage.
- If simulated correctly, you should see: **"Predicted Stage: Command and Control"**.

---

## 🛠 Troubleshooting
- **Port 8000 Conflict:** If the backend fails to start, ensure no other process is using port 8000.
- **Interface Issues:** The system is configured to use the loopback interface (`lo`) for simulation. If you are testing on a real network, the `interface` setting in `backend/fastapi/services/detector_service.py` may need to be updated to your active Ethernet/Wi-Fi adapter.
- **State Not Updating:** Ensure you are running the backend as a module (`python -m backend.fastapi.main`) to avoid `ModuleNotFoundError`.
