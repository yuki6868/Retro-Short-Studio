from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class HeadlessPyxelImage:
    calls: list[tuple[str, int, int, str]] = field(default_factory=list)

    def load(self, x: int, y: int, filename: str) -> None:
        self.calls.append(("load", x, y, filename))


class HeadlessPyxelApi:
    """Pyxel-compatible API for local frame capture tests and headless preview.

    The real Pyxel package is still the production renderer dependency. This
    adapter implements the same tiny port so the HTTP preview bridge can produce
    deterministic frames in environments where a Pyxel window is unavailable.
    """

    def __init__(self, image_banks: int = 16) -> None:
        self.images = [HeadlessPyxelImage() for _ in range(image_banks)]
        self.calls: list[tuple[str, Any]] = []

    def init(self, width: int, height: int, title: str = "Retro Short Studio") -> None:
        self.calls.append(("init", width, height, title))

    def cls(self, color: int) -> None:
        self.calls.append(("cls", color))

    def blt(
        self,
        x: int,
        y: int,
        img: int,
        u: int,
        v: int,
        w: int,
        h: int,
        colkey: int | None = None,
        rotate: float = 0,
        scale: float = 1,
    ) -> None:
        self.calls.append(("blt", x, y, img, u, v, w, h, colkey, rotate, scale))
