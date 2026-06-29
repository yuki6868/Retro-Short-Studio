from __future__ import annotations

from typing import Protocol

from engine.api.commands import EngineRequest, EngineResult


class Renderer(Protocol):
    """Renderer capability boundary.

    Pyxel will be an implementation of this protocol later.
    """

    def preview(self, request: EngineRequest) -> EngineResult:
        raise NotImplementedError

    def render(self, request: EngineRequest) -> EngineResult:
        raise NotImplementedError


class StubRenderer:
    """Non-Pyxel renderer used only to prove the engine boundary."""

    def preview(self, request: EngineRequest) -> EngineResult:
        width = int(request.payload.get("width", 0))
        height = int(request.payload.get("height", 0))
        current_time = float(request.payload.get("currentTime", 0))
        return EngineResult.success(
            request.command_id,
            {
                "framePath": None,
                "currentTime": current_time,
                "width": width,
                "height": height,
            },
        )

    def render(self, request: EngineRequest) -> EngineResult:
        output_directory = str(request.payload.get("outputDirectory", ""))
        return EngineResult.success(
            request.command_id,
            {
                "framePaths": [],
                "outputDirectory": output_directory,
            },
        )
