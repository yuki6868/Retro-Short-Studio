from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.api import EngineRequest
from engine.renderer import PyxelRenderer


@dataclass
class FakeImage:
    calls: list[tuple[str, int, int, str]] = field(default_factory=list)

    def load(self, x: int, y: int, filename: str) -> None:
        self.calls.append(("load", x, y, filename))


class FakePyxel:
    def __init__(self) -> None:
        self.images = [FakeImage() for _ in range(8)]
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


def test_pyxel_renderer_loads_images_and_draws_background_before_characters() -> None:
    fake_pyxel = FakePyxel()
    renderer = PyxelRenderer(fake_pyxel)

    result = renderer.preview(
        EngineRequest(
            command_id="preview-1",
            command="preview",
            payload={
                "width": 320,
                "height": 180,
                "currentTime": 1.25,
                "clearColor": 1,
                "background": {
                    "assetId": "asset-bg",
                    "path": "assets/backgrounds/room.png",
                    "x": 0,
                    "y": 0,
                    "width": 320,
                    "height": 180,
                    "imageBank": 0,
                },
                "characters": [
                    {
                        "assetId": "asset-zunda",
                        "path": "assets/characters/zunda/normal.png",
                        "x": 120,
                        "y": 32,
                        "width": 64,
                        "height": 96,
                        "imageBank": 1,
                        "zIndex": 10,
                        "transparentColor": 0,
                    }
                ],
            },
        )
    )

    assert result.ok is True
    assert result.payload == {
        "framePath": None,
        "currentTime": 1.25,
        "width": 320,
        "height": 180,
        "drawableCount": 2,
    }
    assert fake_pyxel.calls[:2] == [
        ("init", 320, 180, "Retro Short Studio Preview"),
        ("cls", 1),
    ]
    assert fake_pyxel.images[0].calls == [("load", 0, 0, "assets/backgrounds/room.png")]
    assert fake_pyxel.images[1].calls == [("load", 0, 0, "assets/characters/zunda/normal.png")]
    assert fake_pyxel.calls[2:] == [
        ("blt", 0, 0, 0, 0, 0, 320, 180, None, 0, 1),
        ("blt", 120, 32, 1, 0, 0, 64, 96, 0, 0, 1),
    ]


def test_pyxel_renderer_draws_characters_by_z_index_not_payload_order() -> None:
    fake_pyxel = FakePyxel()
    renderer = PyxelRenderer(fake_pyxel)

    renderer.preview(
        EngineRequest(
            command_id="preview-z-order",
            command="preview",
            payload={
                "characters": [
                    {
                        "assetId": "front",
                        "path": "front.png",
                        "x": 10,
                        "y": 20,
                        "width": 30,
                        "height": 40,
                        "imageBank": 1,
                        "zIndex": 20,
                    },
                    {
                        "assetId": "back",
                        "path": "back.png",
                        "x": 50,
                        "y": 60,
                        "width": 70,
                        "height": 80,
                        "imageBank": 2,
                        "zIndex": 5,
                    },
                ]
            },
        )
    )

    draw_calls = [call for call in fake_pyxel.calls if call[0] == "blt"]
    assert draw_calls == [
        ("blt", 50, 60, 2, 0, 0, 70, 80, None, 0, 1),
        ("blt", 10, 20, 1, 0, 0, 30, 40, None, 0, 1),
    ]


def test_pyxel_renderer_reuses_loaded_images_by_bank_and_path() -> None:
    fake_pyxel = FakePyxel()
    renderer = PyxelRenderer(fake_pyxel)
    request = EngineRequest(
        command_id="preview-cache",
        command="preview",
        payload={
            "characters": [
                {
                    "assetId": "character",
                    "path": "same.png",
                    "x": 0,
                    "y": 0,
                    "width": 16,
                    "height": 16,
                    "imageBank": 1,
                }
            ]
        },
    )

    renderer.preview(request)
    renderer.preview(request)

    assert fake_pyxel.images[1].calls == [("load", 0, 0, "same.png")]


def test_pyxel_renderer_render_keeps_export_responsibility_outside_renderer() -> None:
    fake_pyxel = FakePyxel()
    renderer = PyxelRenderer(fake_pyxel)

    result = renderer.render(
        EngineRequest(
            command_id="render-1",
            command="render",
            payload={
                "outputDirectory": "renders/opening",
                "background": {
                    "assetId": "asset-bg",
                    "path": "bg.png",
                    "x": 0,
                    "y": 0,
                    "width": 320,
                    "height": 180,
                    "imageBank": 0,
                },
            },
        )
    )

    assert result.payload == {
        "framePaths": [],
        "outputDirectory": "renders/opening",
        "drawableCount": 1,
    }
