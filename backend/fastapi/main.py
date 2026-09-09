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


@asynccontextmanager
async def lifespan(app: FastAPI):
    detector.start()
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
