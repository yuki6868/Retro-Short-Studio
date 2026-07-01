from __future__ import annotations

import json
import wave
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol
from urllib import parse, request as url_request

from .voice_provider import VoiceProvider, VoiceRequest, VoiceResult


class VoiceVoxHttpClient(Protocol):
    """Minimal HTTP boundary used by VoiceVoxProvider.

    Keeping this small interface makes the adapter testable without requiring a
    running local voice engine process.
    """

    def post_json(self, path: str, query: dict[str, str], body: dict[str, str]) -> dict[str, object]:
        raise NotImplementedError

    def post_bytes(self, path: str, query: dict[str, str], body: dict[str, object]) -> bytes:
        raise NotImplementedError


@dataclass(frozen=True)
class UrllibVoiceVoxHttpClient:
    """HTTP client for a local VOICEVOX Engine-compatible API."""

    base_url: str = "http://127.0.0.1:50021"
    timeout: float = 30.0

    def post_json(self, path: str, query: dict[str, str], body: dict[str, str]) -> dict[str, object]:
        response = self._post(path, query, json.dumps(body).encode("utf-8"), "application/json")
        decoded = json.loads(response.decode("utf-8"))
        if not isinstance(decoded, dict):
            raise ValueError(f"VOICEVOX {path} returned a non-object JSON response.")
        return decoded

    def post_bytes(self, path: str, query: dict[str, str], body: dict[str, object]) -> bytes:
        return self._post(path, query, json.dumps(body).encode("utf-8"), "application/json")

    def _post(self, path: str, query: dict[str, str], body: bytes, content_type: str) -> bytes:
        url = _build_url(self.base_url, path, query)
        request = url_request.Request(
            url,
            data=body,
            method="POST",
            headers={"Content-Type": content_type},
        )
        with url_request.urlopen(request, timeout=self.timeout) as response:  # noqa: S310 - local user-configured engine URL
            return response.read()


class VoiceVoxProvider(VoiceProvider):
    """VoiceProvider implementation backed by a VOICEVOX Engine API.

    This adapter is the only place that knows the VOICEVOX API shape:
    `audio_query`, `synthesis`, `speaker`, and wav bytes. Core and the generic
    engine dispatcher continue to speak only VoiceRequest/VoiceResult.
    """

    def __init__(self, http_client: VoiceVoxHttpClient | None = None) -> None:
        self._http_client = http_client or UrllibVoiceVoxHttpClient()

    def generate(self, request: VoiceRequest) -> VoiceResult:
        speaker_id = _speaker_id(request.speaker_id)
        query = self._http_client.post_json(
            "/audio_query",
            {"speaker": speaker_id, "text": request.text},
            {},
        )
        wav_bytes = self._http_client.post_bytes(
            "/synthesis",
            {"speaker": speaker_id},
            query,
        )

        output_path = Path(request.output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(wav_bytes)

        return VoiceResult(
            voice_asset_id=None,
            wav_path=str(output_path),
            duration=_wav_duration(output_path),
        )


def _speaker_id(value: str) -> str:
    stripped = value.strip()
    if stripped == "":
        raise ValueError("VoiceRequest.speaker_id is required.")
    return stripped


def _wav_duration(path: Path) -> float:
    try:
        with wave.open(str(path), "rb") as wav_file:
            frame_rate = wav_file.getframerate()
            if frame_rate <= 0:
                return 0
            return wav_file.getnframes() / frame_rate
    except (wave.Error, OSError, EOFError):
        return 0


def _build_url(base_url: str, path: str, query: dict[str, str]) -> str:
    normalized_base = base_url.rstrip("/")
    normalized_path = path if path.startswith("/") else f"/{path}"
    encoded_query = parse.urlencode(query)
    return f"{normalized_base}{normalized_path}?{encoded_query}"


def create_default_voice_provider() -> VoiceProvider:
    """Create the default local voice provider.

    VOICEVOX itself is expected to be installed outside this Git repository,
    usually as a sibling directory of Retro-Short-Studio. The provider still
    talks to the local engine API, but the locator gives the app a clear place
    to verify the user-installed runtime without committing it to Git.
    """

    from .voice_provider import StubVoiceProvider
    from .voicevox_locator import VoiceVoxLocator

    installation = VoiceVoxLocator().find()
    if installation is None:
        return StubVoiceProvider()

    try:
        from .voicevox_core_provider import VoiceVoxCoreProvider

        return VoiceVoxCoreProvider(installation=installation)
    except (FileNotFoundError, ImportError, ModuleNotFoundError):
        return StubVoiceProvider()
