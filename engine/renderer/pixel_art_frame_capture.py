from __future__ import annotations

import base64
import io
import struct
import zlib
from dataclasses import dataclass
from typing import Any, Sequence

from .font_repository import FontRepository, FontSpec, LocalFontRepository
from .pyxel_renderer import PyxelDrawable

from engine.config.preview_settings_repository import (
    PreviewSettingsRepository,
)

try:
    from PIL import Image, ImageDraw
except Exception:  # pragma: no cover - fallback path keeps preview usable without Pillow.
    Image = None  # type: ignore[assignment]
    ImageDraw = None  # type: ignore[assignment]

Palette = list[tuple[int, int, int, int]]

DEFAULT_PALETTE: Palette = [
    (0, 0, 0, 255),
    (29, 43, 83, 255),
    (126, 37, 83, 255),
    (0, 135, 81, 255),
    (171, 82, 54, 255),
    (95, 87, 79, 255),
    (194, 195, 199, 255),
    (255, 241, 232, 255),
    (255, 0, 77, 255),
    (255, 163, 0, 255),
    (255, 236, 39, 255),
    (0, 228, 54, 255),
    (41, 173, 255, 255),
    (131, 118, 156, 255),
    (255, 119, 168, 255),
    (255, 204, 170, 255),
]


@dataclass(frozen=True)
class PixelArtFrameCapture:
    """Captures PyxelRenderer commands into a browser-displayable pixel frame.

    The renderer still owns draw ordering and image commands. This object is a
    capture strategy used by the local HTTP preview bridge so React displays a
    frame produced by the engine boundary, not a React/SVG mock.
    """

    scale: int = 4
    palette: Palette = None  # type: ignore[assignment]
    font_repository: FontRepository | None = None
    font_spec: FontSpec | None = None
    settings_repository: PreviewSettingsRepository | None = None

    def __post_init__(self) -> None:
        if self.palette is None:
            object.__setattr__(self, "palette", DEFAULT_PALETTE)
        if self.font_repository is None:
            object.__setattr__(self, "font_repository", LocalFontRepository.default())
        if self.settings_repository is None:
            object.__setattr__(
                self,
                "settings_repository",
                PreviewSettingsRepository.default(),
            )

    def capture(self, *, width: int, height: int, clear_color: int, drawables: Sequence[PyxelDrawable], text_overlays: Sequence[dict[str, Any]]) -> str:
        low_width = max(1, width // self.scale)
        low_height = max(1, height // self.scale)
        pixels = [[self._color(clear_color) for _ in range(low_width)] for _ in range(low_height)]

        self._rect(pixels, 0, 0, low_width, low_height, self._color(clear_color))
        for drawable in drawables:
            self._draw_drawable(pixels, drawable)

        font = self._resolve_font() if text_overlays else None
        if Image is not None and ImageDraw is not None:
            png_bytes = self._encode_with_text_overlays(pixels, text_overlays, font)
        else:
            for overlay in text_overlays:
                self._draw_text_bar(pixels, overlay)
            png_bytes = encode_png_rgba(pixels, self.scale)
        return "data:image/png;base64," + base64.b64encode(png_bytes).decode("ascii")

    def _encode_with_text_overlays(
        self,
        pixels: list[list[tuple[int, int, int, int]]],
        text_overlays: Sequence[dict[str, Any]],
        font: Any,
    ) -> bytes:
        image = low_pixels_to_image(pixels, self.scale)
        draw = ImageDraw.Draw(image)

        for overlay in text_overlays:
            text = str(overlay.get("text", ""))
            if text.strip() == "":
                continue

            x = int(overlay.get("x", 0))
            y = int(overlay.get("y", 0))
            color = self._color(int(overlay.get("color", 7)))
            background_color = self._color(int(overlay.get("backgroundColor", 0)))
            padding_x = int(overlay.get("paddingX", 8))
            padding_y = int(overlay.get("paddingY", 4))
            max_width = max(1, image.width - x - padding_x)

            lines = wrap_text_for_width(draw, text, font, max_width - padding_x * 2)
            if not lines:
                continue

            line_metrics = [text_size(draw, line, font) for line in lines]
            text_width = max(width for width, _ in line_metrics)
            line_height = max(height for _, height in line_metrics)
            box_width = min(max_width, text_width + padding_x * 2)
            box_height = line_height * len(lines) + padding_y * 2

            draw.rectangle([x, y, x + box_width, y + box_height], fill=background_color)
            cursor_y = y + padding_y
            for line in lines:
                draw.text((x + padding_x, cursor_y), line, fill=color, font=font)
                cursor_y += line_height

        output = io.BytesIO()
        image.save(output, format="PNG")
        return output.getvalue()

    def _resolve_font(self) -> Any:
        settings = self.settings_repository.load()
        font_spec = self.font_spec or FontSpec(
            name=settings.default_font,
            size=settings.font_size,
        )
        return self.font_repository.get(font_spec)

    def _draw_drawable(self, pixels: list[list[tuple[int, int, int, int]]], drawable: PyxelDrawable) -> None:
        x = drawable.x // self.scale
        y = drawable.y // self.scale
        w = max(1, int(drawable.width * drawable.scale) // self.scale)
        h = max(1, int(drawable.height * drawable.scale) // self.scale)
        color_index = 12 if drawable.z_index < 0 else 11
        outline = self._color(7)
        fill = self._color(color_index)
        shadow = self._color(5)
        self._rect(pixels, x + 2, y + 2, w, h, shadow)
        self._rect(pixels, x, y, w, h, outline)
        self._rect(pixels, x + 2, y + 2, max(1, w - 4), max(1, h - 4), fill)

    def _draw_text_bar(self, pixels: list[list[tuple[int, int, int, int]]], overlay: dict[str, Any]) -> None:
        text = str(overlay.get("text", ""))
        if text.strip() == "":
            return

        x = int(overlay.get("x", 0)) // self.scale
        y = int(overlay.get("y", 0)) // self.scale
        color = self._color(int(overlay.get("color", 7)))
        background_color = self._color(int(overlay.get("backgroundColor", 0)))
        max_width = max(1, len(pixels[0]) - x - 1)
        text_width = min(pixel_text_width(text), max_width - 4)
        box_width = max(6, min(text_width + 4, max_width))

        self._rect(pixels, x, y, box_width, 7, background_color)
        self._draw_pixel_text(pixels, text, x + 2, y + 1, color, max_width=box_width - 4)

    def _draw_pixel_text(
        self,
        pixels: list[list[tuple[int, int, int, int]]],
        text: str,
        x: int,
        y: int,
        color: tuple[int, int, int, int],
        *,
        max_width: int,
    ) -> None:
        cursor = x
        end_x = x + max_width
        for char in text.upper():
            glyph = FONT_3X5.get(char, FONT_3X5.get("?"))
            if glyph is None:
                continue
            if cursor + 3 > end_x:
                break
            for row_index, row in enumerate(glyph):
                for col_index, pixel in enumerate(row):
                    if pixel == "1":
                        self._rect(pixels, cursor + col_index, y + row_index, 1, 1, color)
            cursor += 4

    def _rect(self, pixels: list[list[tuple[int, int, int, int]]], x: int, y: int, w: int, h: int, color: tuple[int, int, int, int]) -> None:
        height = len(pixels)
        width = len(pixels[0]) if height > 0 else 0
        for py in range(max(0, y), min(height, y + h)):
            row = pixels[py]
            for px in range(max(0, x), min(width, x + w)):
                row[px] = color

    def _color(self, index: int) -> tuple[int, int, int, int]:
        return self.palette[index % len(self.palette)]


def pixel_text_width(text: str) -> int:
    return max(0, len(text) * 4 - 1)


FONT_3X5: dict[str, tuple[str, str, str, str, str]] = {
    " ": ("000", "000", "000", "000", "000"),
    "0": ("111", "101", "101", "101", "111"),
    "1": ("010", "110", "010", "010", "111"),
    "2": ("111", "001", "111", "100", "111"),
    "3": ("111", "001", "111", "001", "111"),
    "4": ("101", "101", "111", "001", "001"),
    "5": ("111", "100", "111", "001", "111"),
    "6": ("111", "100", "111", "101", "111"),
    "7": ("111", "001", "010", "010", "010"),
    "8": ("111", "101", "111", "101", "111"),
    "9": ("111", "101", "111", "001", "111"),
    "A": ("010", "101", "111", "101", "101"),
    "B": ("110", "101", "110", "101", "110"),
    "C": ("111", "100", "100", "100", "111"),
    "D": ("110", "101", "101", "101", "110"),
    "E": ("111", "100", "110", "100", "111"),
    "F": ("111", "100", "110", "100", "100"),
    "G": ("111", "100", "101", "101", "111"),
    "H": ("101", "101", "111", "101", "101"),
    "I": ("111", "010", "010", "010", "111"),
    "J": ("001", "001", "001", "101", "111"),
    "K": ("101", "101", "110", "101", "101"),
    "L": ("100", "100", "100", "100", "111"),
    "M": ("101", "111", "111", "101", "101"),
    "N": ("101", "111", "111", "111", "101"),
    "O": ("111", "101", "101", "101", "111"),
    "P": ("111", "101", "111", "100", "100"),
    "Q": ("111", "101", "101", "111", "001"),
    "R": ("110", "101", "110", "101", "101"),
    "S": ("111", "100", "111", "001", "111"),
    "T": ("111", "010", "010", "010", "010"),
    "U": ("101", "101", "101", "101", "111"),
    "V": ("101", "101", "101", "101", "010"),
    "W": ("101", "101", "111", "111", "101"),
    "X": ("101", "101", "010", "101", "101"),
    "Y": ("101", "101", "010", "010", "010"),
    "Z": ("111", "001", "010", "100", "111"),
    ".": ("000", "000", "000", "000", "010"),
    ":": ("000", "010", "000", "010", "000"),
    "-": ("000", "000", "111", "000", "000"),
    "_": ("000", "000", "000", "000", "111"),
    "/": ("001", "001", "010", "100", "100"),
    "?": ("111", "001", "010", "000", "010"),
}


def encode_png_rgba(low_pixels: list[list[tuple[int, int, int, int]]], scale: int) -> bytes:
    low_height = len(low_pixels)
    low_width = len(low_pixels[0]) if low_height > 0 else 1
    width = low_width * scale
    height = low_height * scale
    rows = []
    for low_row in low_pixels:
        expanded_row = b"".join(bytes(channel for pixel in [color] for channel in pixel) for color in low_row for _ in range(scale))
        for _ in range(scale):
            rows.append(b"\x00" + expanded_row)
    raw = b"".join(rows)
    return b"".join(
        [
            b"\x89PNG\r\n\x1a\n",
            _chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)),
            _chunk(b"IDAT", zlib.compress(raw)),
            _chunk(b"IEND", b""),
        ]
    )


def _chunk(kind: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)


def low_pixels_to_image(low_pixels: list[list[tuple[int, int, int, int]]], scale: int):
    if Image is None:
        raise RuntimeError("Pillow is required for low_pixels_to_image")

    low_height = len(low_pixels)
    low_width = len(low_pixels[0]) if low_height > 0 else 1
    image = Image.new("RGBA", (low_width, low_height))
    image.putdata([color for row in low_pixels for color in row])
    return image.resize((low_width * scale, low_height * scale), Image.Resampling.NEAREST)


def text_size(draw: Any, text: str, font: Any) -> tuple[int, int]:
    try:
        bbox = draw.textbbox((0, 0), text, font=font)
        return max(1, bbox[2] - bbox[0]), max(1, bbox[3] - bbox[1])
    except Exception:
        return max(1, len(text) * 8), 16


def wrap_text_for_width(draw: Any, text: str, font: Any, max_width: int) -> list[str]:
    if max_width <= 0:
        return []

    lines: list[str] = []
    current = ""
    for char in text:
        candidate = current + char
        if current and text_size(draw, candidate, font)[0] > max_width:
            lines.append(current)
            current = char
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines
