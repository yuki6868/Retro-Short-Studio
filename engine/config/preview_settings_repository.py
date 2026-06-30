from __future__ import annotations

import json
from pathlib import Path

from core.settings.preview_settings import PreviewSettings


class PreviewSettingsRepository:

    def __init__(self, path: Path):
        self._path = path

    @classmethod
    def default(cls):
        return cls(
            Path(__file__).resolve().parents[2]
            / "assets"
            / "config"
            / "preview_settings.json"
        )

    def load(self) -> PreviewSettings:
        data = json.loads(self._path.read_text(encoding="utf-8"))

        return PreviewSettings(
            default_font=data["defaultFont"],
            font_size=data["fontSize"],
        )