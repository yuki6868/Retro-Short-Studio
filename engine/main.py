from __future__ import annotations

from engine.api import EngineCommandDispatcher, EngineRequest, EngineResult
from engine.exporter import StubExporter
from engine.renderer import StubRenderer
from engine.voice import StubVoiceProvider


class EngineApp:
    """Top-level Python engine application object.

    This is intentionally a thin composition root. It wires capability
    adapters but does not know React, Core internals, or storage details.
    """

    def __init__(self, dispatcher: EngineCommandDispatcher) -> None:
        self._dispatcher = dispatcher

    def execute(self, request: EngineRequest) -> EngineResult:
        return self._dispatcher.execute(request)


def create_engine_app() -> EngineApp:
    """Create the default skeleton engine app.

    Concrete Pyxel / VOICEVOX / ffmpeg adapters are intentionally not wired
    in Commit 14.
    """

    return EngineApp(
        EngineCommandDispatcher(
            renderer=StubRenderer(),
            voice_provider=StubVoiceProvider(),
            exporter=StubExporter(),
        )
    )


def main() -> None:
    """CLI placeholder for future local engine process startup."""

    app = create_engine_app()
    health = app.execute(EngineRequest(command_id="engine-health", command="preview", payload={}))
    if not health.ok:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
