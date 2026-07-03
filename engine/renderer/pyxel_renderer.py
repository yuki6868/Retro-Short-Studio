from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Protocol, Sequence

from engine.api.commands import EngineRequest, EngineResult


class PyxelImage(Protocol):
    """Small part of pyxel.Image used by the renderer adapter."""

    def load(self, x: int, y: int, filename: str) -> None:
        raise NotImplementedError


class FrameCapture(Protocol):
    def capture(self, *, width: int, height: int, clear_color: int, drawables: Sequence["PyxelDrawable"], text_overlays: Sequence[dict[str, Any]]) -> str:
        raise NotImplementedError


class PyxelApi(Protocol):
    """Pyxel API surface required by Retro Short Studio.

    Keeping this protocol tiny lets tests use a fake Pyxel object and keeps
    Pyxel-specific calls out of Core, App, and Frontend.
    """

    images: Sequence[PyxelImage]

    def init(self, width: int, height: int, title: str = "Retro Short Studio") -> None:
        raise NotImplementedError

    def cls(self, color: int) -> None:
        raise NotImplementedError

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
        raise NotImplementedError


@dataclass(frozen=True)
class PyxelDrawable:
    """Drawable image command consumed only by PyxelRenderer."""

    asset_id: str
    path: str
    x: int
    y: int
    width: int
    height: int
    image_bank: int
    z_index: int
    scale: float = 1
    rotation: float = 0
    transparent_color: int | None = None

    @staticmethod
    def from_payload(payload: dict[str, Any], *, default_bank: int, default_z_index: int) -> "PyxelDrawable":
        return PyxelDrawable(
            asset_id=str(payload.get("assetId", "")),
            path=str(payload.get("path", "")),
            x=int(payload.get("x", 0)),
            y=int(payload.get("y", 0)),
            width=int(payload.get("width", 0)),
            height=int(payload.get("height", 0)),
            image_bank=int(payload.get("imageBank", default_bank)),
            z_index=int(payload.get("zIndex", default_z_index)),
            scale=float(payload.get("scale", 1)),
            rotation=float(payload.get("rotation", 0)),
            transparent_color=payload.get("transparentColor"),
        )


class PyxelRenderer:
    """Renderer adapter backed by Pyxel.

    This class only translates an already-evaluated render payload into Pyxel
    image-load and draw calls. It never edits Project, Scene, Character, or
    Action data.
    """

    def __init__(self, pyxel_api: PyxelApi | None = None, frame_capture: FrameCapture | None = None) -> None:
        self._pyxel = pyxel_api if pyxel_api is not None else self._load_pyxel()
        self._frame_capture = frame_capture
        self._loaded_assets: set[tuple[int, str]] = set()

    def preview(self, request: EngineRequest) -> EngineResult:
        try:
            width = int(request.payload.get("width", 1280))
            height = int(request.payload.get("height", 720))
            current_time = float(request.payload.get("currentTime", 0))

            self._pyxel.init(width, height, title="Retro Short Studio Preview")
            clear_color = int(request.payload.get("clearColor", 0))
            self._pyxel.cls(clear_color)

            drawables = self._collect_drawables(request.payload)
            for drawable in drawables:
                self._load_image(drawable)
                self._draw_image(drawable)

            frame_path = None
            if self._frame_capture is not None:
                frame_path = self._frame_capture.capture(
                    width=width,
                    height=height,
                    clear_color=clear_color,
                    drawables=drawables,
                    text_overlays=self._collect_text_overlays(request.payload),
                )

            return EngineResult.success(
                request.command_id,
                {
                    "framePath": frame_path,
                    "currentTime": current_time,
                    "width": width,
                    "height": height,
                    "drawableCount": len(drawables),
                },
            )
        except (RuntimeError, ValueError, OSError) as error:
            return EngineResult.failure(request.command_id, str(error))

    def render(self, request: EngineRequest) -> EngineResult:
        preview_result = self.preview(request)
        if not preview_result.ok:
            return preview_result

        output_directory = str(request.payload.get("outputDirectory", ""))
        return EngineResult.success(
            request.command_id,
            {
                "framePaths": [],
                "outputDirectory": output_directory,
                "drawableCount": preview_result.payload["drawableCount"] if preview_result.payload else 0,
            },
        )

    def _collect_drawables(self, payload: dict[str, Any]) -> list[PyxelDrawable]:
        drawables: list[PyxelDrawable] = []

        background = payload.get("background")
        if isinstance(background, dict):
            drawables.append(PyxelDrawable.from_payload(background, default_bank=0, default_z_index=-10_000))

        characters = payload.get("characters", [])
        if isinstance(characters, list):
            for index, character in enumerate(characters):
                if isinstance(character, dict):
                    drawables.append(
                        PyxelDrawable.from_payload(character, default_bank=index + 1, default_z_index=index)
                    )

        return sorted(drawables, key=lambda drawable: drawable.z_index)

    def _collect_text_overlays(self, payload: dict[str, Any]) -> list[dict[str, Any]]:
        overlays = payload.get("textOverlays", [])
        if not isinstance(overlays, list):
            return []
        return [overlay for overlay in overlays if isinstance(overlay, dict)]

    def _load_image(self, drawable: PyxelDrawable) -> None:
        if not drawable.path:
            raise ValueError("PyxelDrawable path must not be empty")

        key = (drawable.image_bank, drawable.path)
        if key in self._loaded_assets:
            return

        self._pyxel.images[drawable.image_bank].load(0, 0, resolve_pyxel_asset_path(drawable.path))
        self._loaded_assets.add(key)

    def _draw_image(self, drawable: PyxelDrawable) -> None:
        self._pyxel.blt(
            drawable.x,
            drawable.y,
            drawable.image_bank,
            0,
            0,
            drawable.width,
            drawable.height,
            drawable.transparent_color,
            drawable.rotation,
            drawable.scale,
        )

    @staticmethod
    def _load_pyxel() -> PyxelApi:
        import pyxel  # type: ignore[import-not-found]

        return pyxel


def resolve_pyxel_asset_path(path: str) -> str:
    normalized = path.replace("\\", "/").strip()

    if normalized == "" or Path(normalized).is_absolute() or ".." in Path(normalized).parts:
        return path

    repository_root = Path(__file__).resolve().parents[2]
    candidates = [
        (repository_root / normalized).resolve(),
        (repository_root / "backend" / normalized).resolve(),
    ]

    for candidate in candidates:
        if candidate.is_file():
            return str(candidate)

    return path
