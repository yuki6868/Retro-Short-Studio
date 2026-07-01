from __future__ import annotations

from pathlib import Path
import sys
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

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


@app.get("/api/project-files")
def project_file(path: str) -> FileResponse:
    requested_path = path.strip()

    if requested_path == "":
        raise HTTPException(status_code=400, detail="Project file path is required.")

    resolved_file = _resolve_project_file(requested_path)

    if not resolved_file.is_file():
        raise HTTPException(status_code=404, detail="Project file was not found.")

    return FileResponse(resolved_file)


def _resolve_project_file(requested_path: str) -> Path:
    normalized_path = Path(requested_path)

    if normalized_path.is_absolute() or ".." in normalized_path.parts:
        raise HTTPException(status_code=400, detail="Project file path is outside projects.")

    project_roots = [
        (REPOSITORY_ROOT / "projects").resolve(),
        (REPOSITORY_ROOT / "backend" / "projects").resolve(),
    ]

    for project_root in project_roots:
        resolved_file = (REPOSITORY_ROOT / requested_path).resolve() if project_root == project_roots[0] else (REPOSITORY_ROOT / "backend" / requested_path).resolve()
        try:
            resolved_file.relative_to(project_root)
        except ValueError:
            continue
        if resolved_file.is_file():
            return resolved_file

    # Return the canonical repository project path so callers still receive a
    # 404 instead of learning about fallback directories.
    fallback_file = (REPOSITORY_ROOT / requested_path).resolve()
    try:
        fallback_file.relative_to(project_roots[0])
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Project file path is outside projects.") from exc
    return fallback_file


def _as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}
