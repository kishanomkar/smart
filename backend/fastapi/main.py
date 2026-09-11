"""FastAPI server for the AI Network Attack Forecasting system."""

from __future__ import annotations

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from typing import Any
from contextlib import asynccontextmanager

from backend.fastapi.services.detector_service import _DETECTOR as detector
from backend.fastapi.routes.api_routes import router as api_router

# Initialize Detector
MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "world_model.pt"


import threading
import time

def start_background_simulator():
    """Automatically simulates live network traffic packets in the background on deployment."""
    def _simulator_loop():
        time.sleep(3)
        window = 1
        while True:
            try:
                for i in range(10):
                    dport = 80 if i < 5 else 445
                    flags = "S" if i % 2 == 0 else "SA"
                    src = f"192.168.1.{10 + (window % 10)}"
                    detector.inject_packet(src, "127.0.0.1", dport, flags)
                    time.sleep(0.05)
                
                time.sleep(2.5)
                detector.inject_packet("1.1.1.1", "127.0.0.1", 80, "S")
                window += 1
            except Exception as e:
                print(f"Auto traffic simulator note: {e}")
                time.sleep(3)

    thread = threading.Thread(target=_simulator_loop, daemon=True)
    thread.start()

@asynccontextmanager
async def lifespan(app: FastAPI):
    detector.start()
    start_background_simulator()
    yield
    detector.stop()

app = FastAPI(title="AI Network Attack Forecasting API", lifespan=lifespan)

# CORS for Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the existing API routes (including /dashboard-summary)
app.include_router(api_router)

@app.post("/simulate-packet")
async def simulate_packet(src: str = "192.168.1.10", dst: str = "127.0.0.1", dport: int = 80, flags: str = "S"):
    detector.inject_packet(src, dst, dport, flags)
    return {"status": "Packet injected"}

@app.get("/status")
async def get_status():
    return {
        "status": "online",
        "model_loaded": True,
        "capture_active": detector.is_running,
        "interface": detector.interface
    }

@app.get("/model-info")
async def get_model_info():
    return {
        "expected_features": detector.artifact.feature_names,
        "expected_dim": len(detector.artifact.feature_names),
        "history_windows": detector.artifact.history_windows
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
