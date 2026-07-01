from pathlib import Path

from engine import create_engine_app
from engine.api import EngineCommandDispatcher, EngineRequest, EngineResult
from engine.exporter import StubExporter
from engine.renderer import StubRenderer
from engine.voice import StubVoiceProvider, VoiceRequest, VoiceResult


def test_engine_app_routes_preview_through_preview_renderer_boundary() -> None:
    app = create_engine_app()

    result = app.execute(
        EngineRequest(
            command_id="cmd-preview-1",
            command="preview",
            payload={"currentTime": 1.5, "width": 1280, "height": 720},
        )
    )

    assert result.ok is True
    assert result.payload is not None
    assert result.payload["framePath"].startswith("data:image/png;base64,")
    assert result.payload["currentTime"] == 1.5
    assert result.payload["width"] == 1280
    assert result.payload["height"] == 720


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
            payload={
                "projectId": "project-1",
                "talkActionId": "action-talk-1",
                "text": "こんにちは",
                "speakerId": "zundamon-normal",
                "outputPath": "voices/talk.wav",
            },
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


def test_voice_provider_interface_is_independent_from_voicevox_and_engine_commands() -> None:
    provider = StubVoiceProvider()

    result = provider.generate(
        VoiceRequest(
            project_id="project-1",
            talk_action_id="action-talk-1",
            text="こんにちは",
            speaker_id="zundamon-normal",
            output_path="voices/action-talk-1.wav",
        )
    )

    assert result == VoiceResult(
        voice_asset_id=None,
        wav_path="voices/action-talk-1.wav",
        duration=0,
    )


def test_engine_dispatcher_validates_voice_payload_before_provider_call() -> None:
    dispatcher = EngineCommandDispatcher(
        renderer=StubRenderer(),
        voice_provider=StubVoiceProvider(),
        exporter=StubExporter(),
    )

    result = dispatcher.execute(
        EngineRequest(
            command_id="cmd-voice-invalid",
            command="voice",
            payload={"outputPath": "voices/missing-text.wav"},
        )
    )

    assert result.ok is False
    assert result.error == "VoiceRequest.projectId is required."


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
