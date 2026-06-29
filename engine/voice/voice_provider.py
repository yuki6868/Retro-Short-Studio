from __future__ import annotations

from typing import Protocol

from engine.api.commands import EngineRequest, EngineResult


class VoiceProvider(Protocol):
    """Voice generation boundary.

    VOICEVOX will be an implementation of this protocol later.
    """

    def generate_voice(self, request: EngineRequest) -> EngineResult:
        raise NotImplementedError


class StubVoiceProvider:
    """Non-VOICEVOX provider used only to prove the engine boundary."""

    def generate_voice(self, request: EngineRequest) -> EngineResult:
        output_path = str(request.payload.get("outputPath", ""))
        return EngineResult.success(
            request.command_id,
            {
                "voiceAssetId": None,
                "wavPath": output_path,
                "duration": 0,
            },
        )
