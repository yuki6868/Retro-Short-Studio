"""Python engine boundary for Retro Short Studio.

The engine owns rendering, voice generation, and export adapters.
It must not edit Project state directly and must not leak concrete tools
such as Pyxel, VOICEVOX, or ffmpeg to the frontend/app boundary.
"""

from .main import EngineApp, create_engine_app

__all__ = ["EngineApp", "create_engine_app"]
