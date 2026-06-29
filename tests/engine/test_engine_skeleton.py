from pathlib import Path

from engine import create_engine_app
from engine.api import EngineCommandDispatcher, EngineRequest, EngineResult
from engine.exporter import StubExporter
from engine.renderer import StubRenderer
from engine.voice import StubVoiceProvider


def test_engine_app_routes_preview_without_pyxel_dependency() -> None:
    app = create_engine_app()

    result = app.execute(
        EngineRequest(
            command_id="cmd-preview-1",
            command="preview",
            payload={"currentTime": 1.5, "width": 1280, "height": 720},
        )
    )

    assert result == EngineResult.success(
        "cmd-preview-1",
        {"framePath": None, "currentTime": 1.5, "width": 1280, "height": 720},
    )


def test_engine_dispatcher_routes_capabilities_to_separate_adapters() -> None:
    dispatcher = EngineCommandDispatcher(
        renderer=StubRenderer(),
        voice_provider=StubVoiceProvider(),
        exporter=StubExporter(),
    )

    render_result = dispatcher.execute(
        EngineRequest(
            command_id="cmd-render-1",
            command="render",
            payload={"outputDirectory": "renders/opening"},
        )
    )
    voice_result = dispatcher.execute(
        EngineRequest(
            command_id="cmd-voice-1",
            command="voice",
            payload={"outputPath": "voices/talk.wav"},
        )
    )
    export_result = dispatcher.execute(
        EngineRequest(
            command_id="cmd-export-1",
            command="export",
            payload={"outputPath": "exports/opening.mp4", "format": "mp4"},
        )
    )

    assert render_result.payload == {"framePaths": [], "outputDirectory": "renders/opening"}
    assert voice_result.payload == {"voiceAssetId": None, "wavPath": "voices/talk.wav", "duration": 0}
    assert export_result.payload == {"outputPath": "exports/opening.mp4", "format": "mp4"}


def test_engine_skeleton_source_does_not_import_concrete_tools() -> None:
    engine_files = [
        "engine/main.py",
        "engine/api/dispatcher.py",
        "engine/renderer/renderer.py",
        "engine/voice/voice_provider.py",
        "engine/exporter/exporter.py",
    ]

    repository_root = Path(__file__).resolve().parents[2]

    for file_path in engine_files:
        source = (repository_root / file_path).read_text(encoding="utf-8").lower()
        assert "import pyxel" not in source
        assert "import voicevox" not in source
        assert "import ffmpeg" not in source
