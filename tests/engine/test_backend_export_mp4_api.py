from __future__ import annotations

import importlib.util
from pathlib import Path

from fastapi.testclient import TestClient

from engine.api import EngineResult

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]

def load_backend_module():
    module_path = REPOSITORY_ROOT / "backend" / "app" / "main.py"
    spec = importlib.util.spec_from_file_location("retro_short_studio_backend_main_export", module_path)
    assert spec is not None
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def test_backend_mp4_export_routes_to_engine_export_boundary(monkeypatch) -> None:
    backend = load_backend_module()

    class RecordingEngine:
        def __init__(self) -> None:
            self.payload = None

        def execute(self, request):
            self.payload = request.payload
            return EngineResult.success(
                request.command_id,
                {
                    "outputPath": "outputs/scene-opening.mp4",
                    "format": "mp4",
                    "fps": 30,
                    "duration": 5,
                    "frameCount": 150,
                    "command": ["ffmpeg"],
                },
            )

    engine = RecordingEngine()
    monkeypatch.setattr(backend, "engine_app", engine)
    client = TestClient(backend.app)

    response = client.post(
        "/api/export/mp4",
        json={
            "commandId": "cmd-mp4-api",
            "command": "export",
            "payload": {
                "projectId": "project-1",
                "scene": {"sceneId": "scene-opening", "duration": 5, "actions": []},
                "assets": [],
                "frameSequence": {"outputDirectory": "renders/scene-opening", "fps": 30, "duration": 5, "frameCount": 150},
                "outputPath": "outputs/scene-opening.mp4",
                "width": 1280,
                "height": 720,
            },
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["payload"]["outputPath"] == "outputs/scene-opening.mp4"
    assert engine.payload["outputPath"] == "outputs/scene-opening.mp4"


def test_local_ffmpeg_exporter_returns_clear_missing_ffmpeg_error(tmp_path, monkeypatch) -> None:
    from engine.exporter import LocalFfmpegExporter
    from engine.api import EngineRequest

    project_root = tmp_path / "projects" / "project-1"
    frames = project_root / "renders" / "scene-opening"
    frames.mkdir(parents=True)
    (frames / "frame_000001.png").write_bytes(b"not-a-real-png")
    monkeypatch.setattr("engine.exporter.exporter.shutil.which", lambda _command: None)

    result = LocalFfmpegExporter(repository_root=tmp_path).export(
        EngineRequest(
            command_id="cmd-mp4",
            command="export",
            payload={
                "projectId": "project-1",
                "scene": {"sceneId": "scene-opening", "duration": 1, "actions": []},
                "assets": [],
                "frameSequence": {"outputDirectory": "renders/scene-opening", "fps": 24, "duration": 1, "frameCount": 24},
                "outputPath": "outputs/scene-opening.mp4",
                "width": 640,
                "height": 360,
            },
        )
    )

    assert result.ok is False
    assert "FFmpeg is not available" in (result.error or "")


def test_local_ffmpeg_exporter_resolves_repository_relative_voice_paths(tmp_path, monkeypatch) -> None:
    from types import SimpleNamespace

    from engine.api import EngineRequest
    from engine.exporter import LocalFfmpegExporter

    project_root = tmp_path / "projects" / "project-1"
    frames = project_root / "renders" / "scene-opening"
    frames.mkdir(parents=True)
    (frames / "frame_000001.png").write_bytes(b"not-a-real-png")
    voice_file = tmp_path / "projects" / "voices" / "action-talk-opening.wav"
    voice_file.parent.mkdir(parents=True)
    voice_file.write_bytes(b"not-a-real-wav")

    commands: list[list[str]] = []

    def fake_run(command, capture_output, text, check):
        commands.append(list(command))
        return SimpleNamespace(returncode=0, stderr="")

    monkeypatch.setattr("engine.exporter.exporter.shutil.which", lambda _command: "/usr/bin/ffmpeg")
    monkeypatch.setattr("engine.exporter.exporter.subprocess.run", fake_run)

    result = LocalFfmpegExporter(repository_root=tmp_path).export(
        EngineRequest(
            command_id="cmd-mp4",
            command="export",
            payload={
                "projectId": "project-1",
                "scene": {
                    "sceneId": "scene-opening",
                    "duration": 2,
                    "actions": [
                        {
                            "actionId": "action-talk-opening",
                            "actionType": "talk",
                            "startTime": 0.5,
                            "endTime": 1.5,
                            "payload": {"generatedVoicePath": "projects/voices/action-talk-opening.wav"},
                        }
                    ],
                },
                "assets": [],
                "frameSequence": {"outputDirectory": "renders/scene-opening", "fps": 30, "duration": 2, "frameCount": 60},
                "outputPath": "outputs/scene-opening.mp4",
                "width": 640,
                "height": 360,
            },
        )
    )

    assert result.ok is True
    ffmpeg_command = commands[1]
    assert str(voice_file) in ffmpeg_command
    assert str(project_root / "projects" / "voices" / "action-talk-opening.wav") not in ffmpeg_command


def test_local_ffmpeg_exporter_keeps_project_relative_voice_paths_project_local(tmp_path, monkeypatch) -> None:
    from types import SimpleNamespace

    from engine.api import EngineRequest
    from engine.exporter import LocalFfmpegExporter

    project_root = tmp_path / "projects" / "project-1"
    frames = project_root / "renders" / "scene-opening"
    frames.mkdir(parents=True)
    (frames / "frame_000001.png").write_bytes(b"not-a-real-png")
    voice_file = project_root / "voices" / "action-talk-opening.wav"
    voice_file.parent.mkdir(parents=True)
    voice_file.write_bytes(b"not-a-real-wav")

    commands: list[list[str]] = []

    def fake_run(command, capture_output, text, check):
        commands.append(list(command))
        return SimpleNamespace(returncode=0, stderr="")

    monkeypatch.setattr("engine.exporter.exporter.shutil.which", lambda _command: "/usr/bin/ffmpeg")
    monkeypatch.setattr("engine.exporter.exporter.subprocess.run", fake_run)

    result = LocalFfmpegExporter(repository_root=tmp_path).export(
        EngineRequest(
            command_id="cmd-mp4",
            command="export",
            payload={
                "projectId": "project-1",
                "scene": {
                    "sceneId": "scene-opening",
                    "duration": 2,
                    "actions": [
                        {
                            "actionId": "action-talk-opening",
                            "actionType": "talk",
                            "startTime": 0,
                            "endTime": 1,
                            "payload": {"generatedVoicePath": "voices/action-talk-opening.wav"},
                        }
                    ],
                },
                "assets": [],
                "frameSequence": {"outputDirectory": "renders/scene-opening", "fps": 30, "duration": 2, "frameCount": 60},
                "outputPath": "outputs/scene-opening.mp4",
                "width": 640,
                "height": 360,
            },
        )
    )

    assert result.ok is True
    assert str(voice_file) in commands[1]


def test_local_ffmpeg_exporter_prefers_project_voice_for_legacy_projects_voices_path(tmp_path, monkeypatch) -> None:
    from types import SimpleNamespace

    from engine.api import EngineRequest
    from engine.exporter import LocalFfmpegExporter

    project_root = tmp_path / "projects" / "project-1"
    frames = project_root / "renders" / "scene-opening"
    frames.mkdir(parents=True)
    (frames / "frame_000001.png").write_bytes(b"not-a-real-png")
    project_voice_file = project_root / "voices" / "action-talk-opening.wav"
    project_voice_file.parent.mkdir(parents=True)
    project_voice_file.write_bytes(b"project-local-voice")
    legacy_voice_file = tmp_path / "projects" / "voices" / "action-talk-opening.wav"
    legacy_voice_file.parent.mkdir(parents=True)
    legacy_voice_file.write_bytes(b"legacy-shared-voice")

    commands: list[list[str]] = []

    def fake_run(command, capture_output, text, check):
        commands.append(list(command))
        return SimpleNamespace(returncode=0, stderr="")

    monkeypatch.setattr("engine.exporter.exporter.shutil.which", lambda _command: "/usr/bin/ffmpeg")
    monkeypatch.setattr("engine.exporter.exporter.subprocess.run", fake_run)

    result = LocalFfmpegExporter(repository_root=tmp_path).export(
        EngineRequest(
            command_id="cmd-mp4",
            command="export",
            payload={
                "projectId": "project-1",
                "scene": {
                    "sceneId": "scene-opening",
                    "duration": 2,
                    "actions": [
                        {
                            "actionId": "action-talk-opening",
                            "actionType": "talk",
                            "startTime": 0,
                            "endTime": 1,
                            "payload": {"generatedVoicePath": "projects/voices/action-talk-opening.wav"},
                        }
                    ],
                },
                "assets": [],
                "frameSequence": {"outputDirectory": "renders/scene-opening", "fps": 30, "duration": 2, "frameCount": 60},
                "outputPath": "outputs/scene-opening.mp4",
                "width": 640,
                "height": 360,
            },
        )
    )

    assert result.ok is True
    ffmpeg_command = commands[1]
    assert str(project_voice_file) in ffmpeg_command
    assert str(legacy_voice_file) not in ffmpeg_command


def test_local_ffmpeg_exporter_falls_back_to_voice_asset_path_when_generated_voice_path_is_missing(tmp_path, monkeypatch) -> None:
    from types import SimpleNamespace

    from engine.api import EngineRequest
    from engine.exporter import LocalFfmpegExporter

    project_root = tmp_path / "projects" / "project-1"
    frames = project_root / "renders" / "scene-opening"
    frames.mkdir(parents=True)
    (frames / "frame_000001.png").write_bytes(b"not-a-real-png")
    asset_voice_file = project_root / "voices" / "action-talk-opening.wav"
    asset_voice_file.parent.mkdir(parents=True)
    asset_voice_file.write_bytes(b"project-local-voice")

    commands: list[list[str]] = []

    def fake_run(command, capture_output, text, check):
        commands.append(list(command))
        return SimpleNamespace(returncode=0, stderr="")

    monkeypatch.setattr("engine.exporter.exporter.shutil.which", lambda _command: "/usr/bin/ffmpeg")
    monkeypatch.setattr("engine.exporter.exporter.subprocess.run", fake_run)

    result = LocalFfmpegExporter(repository_root=tmp_path).export(
        EngineRequest(
            command_id="cmd-mp4",
            command="export",
            payload={
                "projectId": "project-1",
                "scene": {
                    "sceneId": "scene-opening",
                    "duration": 2,
                    "actions": [
                        {
                            "actionId": "action-talk-opening",
                            "actionType": "talk",
                            "startTime": 0,
                            "endTime": 1,
                            "payload": {
                                "generatedVoicePath": "voices/missing-action-talk-opening.wav",
                                "voiceAssetId": "voice-1",
                            },
                        }
                    ],
                },
                "assets": [
                    {
                        "assetId": "voice-1",
                        "assetName": "Voice action-talk-opening",
                        "assetType": "voice",
                        "assetPath": "voices/action-talk-opening.wav",
                    }
                ],
                "frameSequence": {"outputDirectory": "renders/scene-opening", "fps": 30, "duration": 2, "frameCount": 60},
                "outputPath": "outputs/scene-opening.mp4",
                "width": 640,
                "height": 360,
            },
        )
    )

    assert result.ok is True
    ffmpeg_command = commands[1]
    assert str(asset_voice_file) in ffmpeg_command
    assert str(project_root / "voices" / "missing-action-talk-opening.wav") not in ffmpeg_command
