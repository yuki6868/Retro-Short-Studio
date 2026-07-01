from __future__ import annotations

from pathlib import Path
import sys
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# The backend is started from ./backend during local development:
#   cd backend && uvicorn app.main:app --reload
# Keep engine as a normal repository module without making users start a
# third server just for preview rendering.
REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
if str(REPOSITORY_ROOT) not in sys.path:
    sys.path.insert(0, str(REPOSITORY_ROOT))

from engine import create_engine_app  # noqa: E402
from engine.api import EngineRequest  # noqa: E402

app = FastAPI(title="Retro Short Studio Backend")
engine_app = create_engine_app()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health() -> dict[str, str]:
    return {"status": "ok", "app": "retro-short-studio"}


@app.post("/api/preview/frame")
def preview_frame(body: dict[str, Any]) -> JSONResponse:
    request = EngineRequest(
        command_id=str(body.get("commandId", "preview")),
        command="preview",
        payload=_as_dict(body.get("payload", {})),
    )
    result = engine_app.execute(request)
    status_code = 200 if result.ok else 500
    return JSONResponse(
        status_code=status_code,
        content={
            "commandId": result.command_id,
            "ok": result.ok,
            "payload": result.payload,
            "error": result.error,
        },
    )


@app.post("/api/voice/generate")
def generate_voice(body: dict[str, Any]) -> JSONResponse:
    request = EngineRequest(
        command_id=str(body.get("commandId", "voice")),
        command="voice",
        payload=_as_dict(body.get("payload", {})),
    )
    result = engine_app.execute(request)
    status_code = 200 if result.ok else 500
    return JSONResponse(
        status_code=status_code,
        content={
            "commandId": result.command_id,
            "ok": result.ok,
            "payload": result.payload,
            "error": result.error,
        },
    )


def _as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}
