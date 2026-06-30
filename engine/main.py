from __future__ import annotations

from engine.api import EngineCommandDispatcher, EngineRequest, EngineResult
from engine.exporter import StubExporter
from engine.renderer import PixelArtFrameCapture, PyxelRenderer, HeadlessPyxelApi
from engine.voice import StubVoiceProvider


class EngineApp:
    """Top-level Python engine application object.

    This is intentionally a thin composition root. It wires capability
    adapters but does not know React, Core internals, or storage details.
    HTTP is owned by backend/app/main.py, not by the engine itself.
    """

    def __init__(self, dispatcher: EngineCommandDispatcher) -> None:
        self._dispatcher = dispatcher

    def execute(self, request: EngineRequest) -> EngineResult:
        return self._dispatcher.execute(request)


def create_engine_app() -> EngineApp:
    """Create the default local engine app."""

    return EngineApp(
        EngineCommandDispatcher(
            renderer=PyxelRenderer(pyxel_api=HeadlessPyxelApi(), frame_capture=PixelArtFrameCapture()),
            voice_provider=StubVoiceProvider(),
            exporter=StubExporter(),
        )
    )


def main() -> None:
    """Run a minimal engine health check.

    The engine is a capability module. It does not start a second preview
    server. React reaches preview through the normal FastAPI backend.
    """

    app = create_engine_app()
    health = app.execute(EngineRequest(command_id="engine-health", command="preview", payload={}))
    if not health.ok:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
