from __future__ import annotations

from engine.exporter import Exporter
from engine.renderer import Renderer
from engine.voice import VoiceProvider

from .commands import EngineRequest, EngineResult


class EngineCommandDispatcher:
    """Routes engine commands to capability-specific adapters.

    This is the boundary object used by future process/API wrappers.
    It contains no Project editing logic.
    """

    def __init__(self, renderer: Renderer, voice_provider: VoiceProvider, exporter: Exporter) -> None:
        self._renderer = renderer
        self._voice_provider = voice_provider
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
