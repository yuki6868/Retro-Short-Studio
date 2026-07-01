import importlib.util
from pathlib import Path

from fastapi.testclient import TestClient


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]


def load_backend_app():
    module_path = REPOSITORY_ROOT / "backend" / "app" / "main.py"
    spec = importlib.util.spec_from_file_location("retro_short_studio_backend_main", module_path)
    assert spec is not None
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module.app


def test_fastapi_preview_endpoint_routes_to_engine_without_third_server() -> None:
    client = TestClient(load_backend_app())

    response = client.post(
        "/api/preview/frame",
        json={
            "commandId": "cmd-preview-api",
            "command": "preview",
            "payload": {"currentTime": 1.25, "width": 1280, "height": 720},
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["commandId"] == "cmd-preview-api"
    assert body["ok"] is True
    assert body["payload"]["framePath"].startswith("data:image/png;base64,")
    assert body["payload"]["currentTime"] == 1.25


def test_engine_main_does_not_start_preview_http_server() -> None:
    source = (REPOSITORY_ROOT / "engine" / "main.py").read_text(encoding="utf-8")

    assert "--serve-preview" not in source
    assert "serve_preview_engine" not in source
    assert "HTTPServer" not in source


def test_fastapi_voice_endpoint_routes_to_engine_voice_boundary() -> None:
    client = TestClient(load_backend_app())

    response = client.post(
        "/api/voice/generate",
        json={
            "commandId": "cmd-voice-api",
            "command": "voice",
            "payload": {
                "projectId": "project-1",
                "talkActionId": "action-talk-1",
                "text": "テストなのだ",
                "speakerId": "3",
                "outputPath": "projects/voices/action-talk-1.wav",
            },
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["commandId"] == "cmd-voice-api"
    assert body["ok"] is True
    payload = body["payload"]

    assert payload["voiceAssetId"] is None
    assert payload["wavPath"] == "projects/voices/action-talk-1.wav"
    assert isinstance(payload["duration"], (int, float))
    assert payload["duration"] >= 0
