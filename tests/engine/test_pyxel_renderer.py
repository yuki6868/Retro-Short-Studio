from __future__ import annotations

import base64
import io
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from engine.api import EngineRequest
from engine.renderer import PyxelDrawable, PyxelRenderer


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]


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


def test_pyxel_renderer_can_capture_browser_preview_frame() -> None:
    from engine.renderer import PixelArtFrameCapture

    fake_pyxel = FakePyxel()
    renderer = PyxelRenderer(fake_pyxel, frame_capture=PixelArtFrameCapture(scale=8))

    result = renderer.preview(
        EngineRequest(
            command_id="preview-capture",
            command="preview",
            payload={
                "width": 320,
                "height": 180,
                "currentTime": 0.5,
                "clearColor": 1,
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
                    }
                ],
                "textOverlays": [{"text": "Hello", "x": 16, "y": 120, "color": 7}],
            },
        )
    )

    assert result.ok is True
    assert result.payload is not None
    assert result.payload["framePath"].startswith("data:image/png;base64,")
    assert result.payload["drawableCount"] == 1


def test_pixel_art_frame_capture_draws_text_as_pixels_not_a_solid_bar() -> None:
    from engine.renderer import PixelArtFrameCapture

    capture = PixelArtFrameCapture(scale=8)
    frame_path = capture.capture(
        width=160,
        height=80,
        clear_color=1,
        drawables=[],
        text_overlays=[{"text": "A", "x": 8, "y": 8, "color": 7}],
    )

    assert frame_path.startswith("data:image/png;base64,")


def test_pixel_art_frame_capture_routes_japanese_text_through_font_repository() -> None:
    from engine.renderer import FontSpec, PixelArtFrameCapture

    class SpyFontRepository:
        def __init__(self) -> None:
            self.requests: list[FontSpec] = []

        def get(self, spec: FontSpec):
            self.requests.append(spec)
            return None

    repository = SpyFontRepository()
    capture = PixelArtFrameCapture(scale=8, font_repository=repository, font_spec=FontSpec(name="AkazukiPOP", size=18))

    frame_path = capture.capture(
        width=320,
        height=180,
        clear_color=1,
        drawables=[],
        text_overlays=[{"text": "こんにちは", "x": 8, "y": 120, "color": 7}],
    )

    assert frame_path.startswith("data:image/png;base64,")
    assert repository.requests == [FontSpec(name="AkazukiPOP", size=18)]


def test_local_font_repository_defaults_to_assets_fonts() -> None:
    from engine.renderer import LocalFontRepository

    repository = LocalFontRepository.default()

    assert repository.root.name == "fonts"
    assert repository.root.parent.name == "assets"


def test_pixel_art_frame_capture_draws_saved_background_image_pixels() -> None:
    from PIL import Image
    from engine.renderer import PixelArtFrameCapture

    project_dir = REPOSITORY_ROOT / "projects" / "project-render-image-test" / "assets" / "backgrounds"
    image_path = project_dir / "solid-red.png"
    project_dir.mkdir(parents=True, exist_ok=True)
    Image.new("RGBA", (4, 4), (255, 0, 0, 255)).save(image_path)

    try:
        capture = PixelArtFrameCapture(scale=4)
        frame_path = capture.capture(
            width=16,
            height=16,
            clear_color=1,
            drawables=[
                PyxelDrawable(
                    asset_id="asset-bg-red",
                    path="projects/project-render-image-test/assets/backgrounds/solid-red.png",
                    x=0,
                    y=0,
                    width=16,
                    height=16,
                    image_bank=0,
                    z_index=-10000,
                )
            ],
            text_overlays=[],
        )

        assert frame_path.startswith("data:image/png;base64,")
        png_bytes = base64.b64decode(frame_path.split(",", 1)[1])
        with Image.open(io.BytesIO(png_bytes)) as rendered:
            assert rendered.convert("RGBA").getpixel((2, 2)) == (255, 0, 0, 255)
    finally:
        image_path.unlink(missing_ok=True)
