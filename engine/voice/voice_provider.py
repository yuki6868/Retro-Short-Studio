from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class VoiceRequest:
    """Engine-internal voice generation request.

    This request is intentionally independent from VOICEVOX. Concrete voice
    engines can map these fields to their own APIs in their adapters.
    """

    project_id: str
    talk_action_id: str
    text: str
    speaker_id: str
    output_path: str


@dataclass(frozen=True)
class VoiceResult:
    """Engine-internal voice generation result."""

    voice_asset_id: str | None
    wav_path: str
    duration: float


class VoiceProvider(Protocol):
    """Voice generation boundary.

    VOICEVOX will be an implementation of this protocol later.
    """

    def generate(self, request: VoiceRequest) -> VoiceResult:
        raise NotImplementedError


class StubVoiceProvider:
    """Non-VOICEVOX provider used only to prove the voice boundary."""

    def generate(self, request: VoiceRequest) -> VoiceResult:
        return VoiceResult(
            voice_asset_id=None,
            wav_path=request.output_path,
            duration=0,
        )
