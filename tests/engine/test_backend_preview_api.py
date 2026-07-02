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


def test_backend_serves_project_voice_files() -> None:
    project_voice_dir = REPOSITORY_ROOT / "projects" / "voices"
    project_voice_dir.mkdir(parents=True, exist_ok=True)
    wav_path = project_voice_dir / "test-preview.wav"
    wav_path.write_bytes(b"RIFF")

    try:
        client = TestClient(load_backend_app())
        response = client.get("/api/project-files", params={"path": "projects/voices/test-preview.wav"})

        assert response.status_code == 200
        assert response.content == b"RIFF"
    finally:
        wav_path.unlink(missing_ok=True)


def test_backend_serves_legacy_backend_project_voice_files() -> None:
    project_voice_dir = REPOSITORY_ROOT / "backend" / "projects" / "voices"
    project_voice_dir.mkdir(parents=True, exist_ok=True)
    wav_path = project_voice_dir / "legacy-preview.wav"
    wav_path.write_bytes(b"RIFF-LEGACY")

    try:
        client = TestClient(load_backend_app())
        response = client.get("/api/project-files", params={"path": "projects/voices/legacy-preview.wav"})

        assert response.status_code == 200
        assert response.content == b"RIFF-LEGACY"
    finally:
        wav_path.unlink(missing_ok=True)


def test_backend_rejects_project_file_path_traversal() -> None:
    client = TestClient(load_backend_app())

    response = client.get("/api/project-files", params={"path": "../README.md"})

    assert response.status_code == 400


def test_backend_writes_project_relative_asset_files() -> None:
    client = TestClient(load_backend_app())
    output_path = REPOSITORY_ROOT / "projects" / "project-api-test" / "assets" / "backgrounds" / "bg.png"

    try:
        response = client.put(
            "/api/projects/project-api-test/files",
            params={"relativePath": "assets/backgrounds/bg.png"},
            content=b"PNGDATA",
        )

        assert response.status_code == 200
        assert response.json()["relativePath"] == "assets/backgrounds/bg.png"
        assert output_path.read_bytes() == b"PNGDATA"

        exists_response = client.get(
            "/api/projects/project-api-test/files/exists",
            params={"relativePath": "assets/backgrounds/bg.png"},
        )
        assert exists_response.status_code == 200
        assert exists_response.json() == {"exists": True}
    finally:
        output_path.unlink(missing_ok=True)


def test_backend_rejects_project_relative_asset_path_traversal() -> None:
    client = TestClient(load_backend_app())

    response = client.put(
        "/api/projects/project-api-test/files",
        params={"relativePath": "../evil.png"},
        content=b"bad",
    )

    assert response.status_code == 400


def test_backend_preview_uses_saved_background_image_file_pixels() -> None:
    from PIL import Image
    import base64
    import io

    project_dir = REPOSITORY_ROOT / "projects" / "project-preview-bg-test" / "assets" / "backgrounds"
    image_path = project_dir / "solid-red.png"
    project_dir.mkdir(parents=True, exist_ok=True)
    Image.new("RGBA", (4, 4), (255, 0, 0, 255)).save(image_path)

    try:
        client = TestClient(load_backend_app())
        response = client.post(
            "/api/preview/frame",
            json={
                "commandId": "cmd-preview-bg-image",
                "command": "preview",
                "payload": {
                    "currentTime": 0,
                    "width": 16,
                    "height": 16,
                    "clearColor": 1,
                    "background": {
                        "assetId": "asset-bg-red",
                        "path": "projects/project-preview-bg-test/assets/backgrounds/solid-red.png",
                        "x": 0,
                        "y": 0,
                        "width": 16,
                        "height": 16,
                        "imageBank": 0,
                        "zIndex": -10000,
                    },
                },
            },
        )

        assert response.status_code == 200
        body = response.json()
        assert body["ok"] is True
        frame_path = body["payload"]["framePath"]
        png_bytes = base64.b64decode(frame_path.split(",", 1)[1])
        with Image.open(io.BytesIO(png_bytes)) as rendered:
            assert rendered.convert("RGBA").getpixel((2, 2)) == (255, 0, 0, 255)
    finally:
        image_path.unlink(missing_ok=True)
