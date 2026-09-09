from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes.api_routes import router

app = FastAPI(title="NETRA AI Analyst API", version="1.0.0")
origins = [item.strip() for item in os.getenv("NETRA_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if item.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["GET", "POST"], allow_headers=["*"])
app.include_router(router)
