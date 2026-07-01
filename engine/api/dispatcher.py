from __future__ import annotations

from typing import Any

from engine.exporter import Exporter
from engine.renderer import Renderer
from engine.voice import VoiceProvider, VoiceRequest

from .commands import EngineRequest, EngineResult


class EngineVoiceProviderAdapter:
    """Maps generic engine commands to the voice-provider boundary.

    The dispatcher speaks EngineRequest/EngineResult because it is the process
    boundary. VoiceProvider speaks VoiceRequest/VoiceResult because it is the
    replaceable voice-engine boundary. Keeping this adapter between them keeps
    future VOICEVOX details out of the dispatcher and out of Core.
    """

    def __init__(self, provider: VoiceProvider) -> None:
        self._provider = provider

    def generate_voice(self, request: EngineRequest) -> EngineResult:
        try:
            voice_request = _to_voice_request(request.payload)
            voice_result = self._provider.generate(voice_request)
        except ValueError as error:
            return EngineResult.failure(request.command_id, str(error))

        return EngineResult.success(
            request.command_id,
            {
                "voiceAssetId": voice_result.voice_asset_id,
                "wavPath": voice_result.wav_path,
                "duration": voice_result.duration,
            },
        )


class EngineCommandDispatcher:
    """Routes engine commands to capability-specific adapters.

    This is the boundary object used by future process/API wrappers.
    It contains no Project editing logic.
    """

    def __init__(self, renderer: Renderer, voice_provider: VoiceProvider, exporter: Exporter) -> None:
        self._renderer = renderer
        self._voice_provider = EngineVoiceProviderAdapter(voice_provider)
        self._exporter = exporter

    def execute(self, request: EngineRequest) -> EngineResult:
        if request.command == "preview":
            return self._renderer.preview(request)
        if request.command == "render":
            return self._renderer.render(request)
        if request.command == "voice":
            return self._voice_provider.generate_voice(request)
        if request.command == "export":
            return self._exporter.export(request)

        return EngineResult.failure(request.command_id, f"Unsupported engine command: {request.command}")


def _to_voice_request(payload: dict[str, Any]) -> VoiceRequest:
    return VoiceRequest(
        project_id=_required_string(payload, "projectId"),
        talk_action_id=_required_string(payload, "talkActionId"),
        text=_required_string(payload, "text"),
        speaker_id=_required_string(payload, "speakerId"),
        output_path=_required_string(payload, "outputPath"),
    )


def _required_string(payload: dict[str, Any], key: str) -> str:
    value = payload.get(key)

    if not isinstance(value, str) or value.strip() == "":
        raise ValueError(f"VoiceRequest.{key} is required.")

    return value
