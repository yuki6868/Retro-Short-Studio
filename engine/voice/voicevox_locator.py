from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class VoiceVoxInstallation:
    """Resolved local VOICEVOX installation outside the Git repository."""

    path: Path
    source: str


class VoiceVoxLocator:
    """Find a user-installed VOICEVOX next to the Retro-Short-Studio repo.

    The expected local development layout is:

        retro_short_studio/
        ├── Retro-Short-Studio/   # Git repository
        └── VOICEVOX/             # User-installed runtime, not tracked by Git

    The path can still be overridden by RETRO_SHORT_STUDIO_VOICEVOX_PATH.
    """

    def __init__(self, repository_root: Path | None = None) -> None:
        self._repository_root = repository_root or Path(__file__).resolve().parents[2]

    def find(self) -> VoiceVoxInstallation | None:
        override = os.environ.get("RETRO_SHORT_STUDIO_VOICEVOX_PATH")
        if override:
            override_path = Path(override).expanduser()
            if override_path.exists():
                return VoiceVoxInstallation(path=override_path, source="env")

        for candidate in self._default_candidates():
            if candidate.exists():
                return VoiceVoxInstallation(path=candidate, source="sibling")

        return None

    def _default_candidates(self) -> list[Path]:
        repository_parent = self._repository_root.parent
        return [
            repository_parent / "VOICEVOX",
            repository_parent / "VOICEVOX.app",
        ]
