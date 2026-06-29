from __future__ import annotations

from typing import Protocol

from engine.api.commands import EngineRequest, EngineResult


class Exporter(Protocol):
    """Video export boundary.

    ffmpeg will be hidden behind an implementation of this protocol later.
    """

    def export(self, request: EngineRequest) -> EngineResult:
        raise NotImplementedError


class StubExporter:
    """Non-ffmpeg exporter used only to prove the engine boundary."""

    def export(self, request: EngineRequest) -> EngineResult:
        output_path = str(request.payload.get("outputPath", ""))
        export_format = str(request.payload.get("format", "frame_sequence"))
        return EngineResult.success(
            request.command_id,
            {
                "outputPath": output_path,
                "format": export_format,
            },
        )
