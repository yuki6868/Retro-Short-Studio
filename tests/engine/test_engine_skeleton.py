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


def test_voicevox_provider_generates_wav_through_voice_provider_boundary(tmp_path) -> None:
    from engine.voice import VoiceRequest, VoiceVoxProvider

    class FakeVoiceVoxHttpClient:
        def __init__(self) -> None:
            self.audio_query_calls = []
            self.synthesis_calls = []

        def post_json(self, path, query, body):
            self.audio_query_calls.append((path, query, body))
            return {"accent_phrases": [], "speedScale": 1.0}

        def post_bytes(self, path, query, body):
            self.synthesis_calls.append((path, query, body))
            return _silent_wav_bytes()

    http_client = FakeVoiceVoxHttpClient()
    output_path = tmp_path / "voices" / "talk.wav"

    result = VoiceVoxProvider(http_client=http_client).generate(
        VoiceRequest(
            project_id="project-1",
            talk_action_id="action-talk-1",
            text="こんにちは",
            speaker_id="3",
            output_path=str(output_path),
        )
    )

    assert http_client.audio_query_calls == [("/audio_query", {"speaker": "3", "text": "こんにちは"}, {})]
    assert http_client.synthesis_calls == [
        ("/synthesis", {"speaker": "3"}, {"accent_phrases": [], "speedScale": 1.0})
    ]
    assert output_path.read_bytes() == _silent_wav_bytes()
    assert result.wav_path == str(output_path)
    assert result.duration == 1.0


def test_voicevox_provider_accepts_non_numeric_speaker_ids_as_adapter_values(tmp_path) -> None:
    from engine.voice import VoiceRequest, VoiceVoxProvider

    class FakeVoiceVoxHttpClient:
        def post_json(self, path, query, body):
            assert query["speaker"] == "zundamon-normal"
            return {"accent_phrases": []}

        def post_bytes(self, path, query, body):
            assert query["speaker"] == "zundamon-normal"
            return b"not-a-real-wav"

    result = VoiceVoxProvider(http_client=FakeVoiceVoxHttpClient()).generate(
        VoiceRequest(
            project_id="project-1",
            talk_action_id="action-talk-1",
            text="こんにちは",
            speaker_id="zundamon-normal",
            output_path=str(tmp_path / "talk.wav"),
        )
    )

    assert result.duration == 0


def _silent_wav_bytes() -> bytes:
    import io
    import wave

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(8000)
        wav_file.writeframes(b"\x00\x00" * 8000)
    return buffer.getvalue()


def test_voicevox_locator_finds_runtime_next_to_repository(tmp_path) -> None:
    from engine.voice import VoiceVoxLocator

    repository_root = tmp_path / "retro_short_studio" / "Retro-Short-Studio"
    repository_root.mkdir(parents=True)
    sibling_voicevox = repository_root.parent / "VOICEVOX"
    sibling_voicevox.mkdir()

    installation = VoiceVoxLocator(repository_root=repository_root).find()

    assert installation is not None
    assert installation.path == sibling_voicevox
    assert installation.source == "sibling"


def test_voicevox_locator_uses_explicit_environment_path(tmp_path, monkeypatch) -> None:
    from engine.voice import VoiceVoxLocator

    repository_root = tmp_path / "retro_short_studio" / "Retro-Short-Studio"
    repository_root.mkdir(parents=True)
    custom_voicevox = tmp_path / "custom" / "VOICEVOX.app"
    custom_voicevox.mkdir(parents=True)
    monkeypatch.setenv("RETRO_SHORT_STUDIO_VOICEVOX_PATH", str(custom_voicevox))

    installation = VoiceVoxLocator(repository_root=repository_root).find()

    assert installation is not None
    assert installation.path == custom_voicevox
    assert installation.source == "env"


def test_voicevox_core_paths_resolve_user_installed_runtime_layout(tmp_path) -> None:
    from engine.voice import VoiceVoxCorePaths

    voicevox_root = tmp_path / "retro_short_studio" / "VOICEVOX"
    (voicevox_root / "dict" / "open_jtalk_dic_utf_8-1.11").mkdir(parents=True)
    (voicevox_root / "models" / "vvms").mkdir(parents=True)
    (voicevox_root / "models" / "vvms" / "0.vvm").write_text("model", encoding="utf-8")
    (voicevox_root / "onnxruntime" / "lib").mkdir(parents=True)
    (voicevox_root / "onnxruntime" / "lib" / "libvoicevox_onnxruntime.1.17.3.dylib").write_text(
        "runtime", encoding="utf-8"
    )

    paths = VoiceVoxCorePaths.from_root(voicevox_root)
    paths.validate()

    assert paths.dictionary_dir == voicevox_root / "dict" / "open_jtalk_dic_utf_8-1.11"
    assert paths.vvm_dir == voicevox_root / "models" / "vvms"
    assert paths.onnxruntime_library == (
        voicevox_root / "onnxruntime" / "lib" / "libvoicevox_onnxruntime.1.17.3.dylib"
    )


def test_voicevox_core_provider_generates_wav_from_local_core_runtime(tmp_path) -> None:
    from engine.voice import VoiceRequest, VoiceVoxCorePaths, VoiceVoxCoreProvider

    class FakeVoiceModel:
        def __init__(self, path: str) -> None:
            self.path = path

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

    class FakeVoiceModelFile:
        opened_paths: list[str] = []

        @classmethod
        def open(cls, path: str):
            cls.opened_paths.append(path)
            return FakeVoiceModel(path)

    class FakeOnnxruntime:
        loaded_filename: str | None = None

        @classmethod
        def load_once(cls, filename: str):
            cls.loaded_filename = filename
            return {"onnxruntime": filename}

    class FakeOpenJtalk:
        def __init__(self, open_jtalk_dict_dir: str) -> None:
            self.open_jtalk_dict_dir = open_jtalk_dict_dir

    class FakeSynthesizer:
        loaded_models: list[str] = []
        tts_calls: list[tuple[str, int]] = []

        def __init__(self, onnxruntime, open_jtalk) -> None:
            self.onnxruntime = onnxruntime
            self.open_jtalk = open_jtalk

        def load_voice_model(self, voice_model) -> None:
            self.loaded_models.append(voice_model.path)

        def tts(self, text: str, style_id: int) -> bytes:
            self.tts_calls.append((text, style_id))
            return _silent_wav_bytes()

    class FakeCoreModule:
        Onnxruntime = FakeOnnxruntime
        OpenJtalk = FakeOpenJtalk
        Synthesizer = FakeSynthesizer
        VoiceModelFile = FakeVoiceModelFile

    voicevox_root = tmp_path / "VOICEVOX"
    (voicevox_root / "dict" / "open_jtalk_dic_utf_8-1.11").mkdir(parents=True)
    (voicevox_root / "models" / "vvms").mkdir(parents=True)
    (voicevox_root / "models" / "vvms" / "0.vvm").write_text("model-0", encoding="utf-8")
    (voicevox_root / "models" / "vvms" / "1.vvm").write_text("model-1", encoding="utf-8")
    (voicevox_root / "onnxruntime" / "lib").mkdir(parents=True)
    (voicevox_root / "onnxruntime" / "lib" / "libvoicevox_onnxruntime.1.17.3.dylib").write_text(
        "runtime", encoding="utf-8"
    )

    output_path = tmp_path / "voices" / "talk.wav"
    result = VoiceVoxCoreProvider(
        paths=VoiceVoxCorePaths.from_root(voicevox_root),
        core_module=FakeCoreModule,
    ).generate(
        VoiceRequest(
            project_id="project-1",
            talk_action_id="talk-1",
            text="テストなのだ",
            speaker_id="3",
            output_path=str(output_path),
        )
    )

    assert output_path.read_bytes() == _silent_wav_bytes()
    assert result.wav_path == str(output_path)
    assert result.duration == 1.0
    assert FakeOnnxruntime.loaded_filename == str(
        voicevox_root / "onnxruntime" / "lib" / "libvoicevox_onnxruntime.1.17.3.dylib"
    )
    assert FakeVoiceModelFile.opened_paths == [
        str(voicevox_root / "models" / "vvms" / "0.vvm"),
        str(voicevox_root / "models" / "vvms" / "1.vvm"),
    ]
    assert FakeSynthesizer.tts_calls == [("テストなのだ", 3)]
