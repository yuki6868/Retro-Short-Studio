from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Protocol

try:
    from PIL import ImageFont
except Exception:  # pragma: no cover - Pillow import failure is handled at runtime.
    ImageFont = None  # type: ignore[assignment]


class RasterFont(Protocol):
    """Font object used by the preview frame capture strategy."""


@dataclass(frozen=True)
class FontSpec:
    """Logical font request for preview text rendering."""

    name: str
    size: int


class FontRepository(Protocol):
    """Loads renderable fonts without making renderer code know file paths."""

    def get(self, spec: FontSpec) -> RasterFont | None:
        raise NotImplementedError


@dataclass(frozen=True)
class LocalFontRepository:
    """Font repository backed by assets/fonts.

    This keeps absolute OS font paths out of renderer code. Users can replace
    assets/fonts/AkazukiPOP.otf later without touching preview/render logic.
    """

    root: Path

    @classmethod
    def default(cls) -> "LocalFontRepository":
        return cls(root=Path(__file__).resolve().parents[2] / "assets" / "fonts")

    def get(self, spec: FontSpec) -> RasterFont | None:
        return _load_font(str(self.root), spec.name, spec.size)


@lru_cache(maxsize=32)
def _load_font(root: str, name: str, size: int) -> RasterFont | None:
    if ImageFont is None:
        return None

    root_path = Path(root)
    candidates = [
        root_path / f"{name}.otf",
        root_path / f"{name}.ttf",
    ]
    for candidate in candidates:
        if candidate.exists():
            try:
                return ImageFont.truetype(str(candidate), size=size)
            except Exception:
                continue

    try:
        return ImageFont.load_default()
    except Exception:
        return None
