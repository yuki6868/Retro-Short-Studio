from __future__ import annotations

from pathlib import Path
import shutil
import subprocess
from typing import Any, Protocol

from engine.api.commands import EngineRequest, EngineResult


class Exporter(Protocol):
    """Video export boundary."""

    def export(self, request: EngineRequest) -> EngineResult:
        raise NotImplementedError


class StubExporter:
    """Non-ffmpeg exporter used only to prove the engine boundary."""

    def export(self, request: EngineRequest) -> EngineResult:
        output_path = str(request.payload.get("outputPath", ""))
        export_format = str(request.payload.get("format", "frame_sequence"))
        return EngineResult.success(
            request.command_id,
            {
                "outputPath": output_path,
                "format": export_format,
            },
        )


class LocalFfmpegExporter:
    """Runs FFmpeg inside the local project folder.

    The frontend writes frame PNG files to projects/{projectId}/renders/{sceneId}.
    This exporter turns those frames plus Talk Action voice paths into
    projects/{projectId}/outputs/{sceneId}.mp4.
    """

    def __init__(self, repository_root: Path, ffmpeg_path: str = "ffmpeg") -> None:
        self._repository_root = repository_root.resolve()
        self._ffmpeg_path = ffmpeg_path

    def export(self, request: EngineRequest) -> EngineResult:
        try:
            payload = _as_dict(request.payload)
            project_id = _required_string(payload, "projectId")
            project_root = self._resolve_project_root(project_id)
            scene = _as_dict(payload.get("scene", {}))
            frame_sequence = _as_dict(payload.get("frameSequence", {}))
            frame_directory = self._resolve_project_file(project_root, _required_string(frame_sequence, "outputDirectory"))
            output_path = _required_string(payload, "outputPath")
            output_file = self._resolve_project_file(project_root, output_path)
            if output_file.suffix.lower() != ".mp4":
                raise ValueError("MP4 export outputPath must end with .mp4.")

            ffmpeg = _required_executable(str(payload.get("ffmpegPath") or self._ffmpeg_path))
            fps = _positive_number(frame_sequence.get("fps"), "fps")
            duration = _positive_number(frame_sequence.get("duration"), "duration")
            frame_count = int(_positive_number(frame_sequence.get("frameCount"), "frameCount"))
            width = int(_positive_number(payload.get("width"), "width"))
            height = int(_positive_number(payload.get("height"), "height"))

            frame_pattern = frame_directory / "frame_%06d.png"
            if not (frame_directory / "frame_000001.png").is_file():
                raise ValueError("Exported frame sequence was not found. Run Export Frames before MP4 Export.")

            output_file.parent.mkdir(parents=True, exist_ok=True)
            audio_inputs, filter_complex = self._build_audio(project_root, scene, _as_list(payload.get("assets")), duration)
            command = [
                ffmpeg,
                "-y",
                "-framerate",
                _format_number(fps),
                "-i",
                str(frame_pattern),
                "-f",
                "lavfi",
                "-t",
                _format_number(duration),
                "-i",
                "anullsrc=channel_layout=stereo:sample_rate=44100",
                *audio_inputs,
                "-filter_complex",
                filter_complex,
                "-map",
                "0:v:0",
                "-map",
                "[aout]",
                "-t",
                _format_number(duration),
                "-r",
                _format_number(fps),
                "-s",
                f"{width}x{height}",
                "-c:v",
                "libx264",
                "-pix_fmt",
                "yuv420p",
                "-c:a",
                "aac",
                "-b:a",
                "192k",
                "-shortest",
                str(output_file),
            ]

            completed = subprocess.run(command, capture_output=True, text=True, check=False)
            if completed.returncode != 0:
                detail = completed.stderr.strip()
                message = "FFmpeg MP4 export failed." if detail == "" else f"FFmpeg MP4 export failed: {detail}"
                return EngineResult.failure(request.command_id, message)

            return EngineResult.success(
                request.command_id,
                {
                    "outputPath": _relative_to_project(project_root, output_file),
                    "format": "mp4",
                    "fps": fps,
                    "duration": duration,
                    "frameCount": frame_count,
                    "command": [_relative_command_item(project_root, item) for item in command],
                },
            )
        except FileNotFoundError as error:
            return EngineResult.failure(request.command_id, str(error))
        except ValueError as error:
            return EngineResult.failure(request.command_id, str(error))

    def _build_audio(self, project_root: Path, scene: dict[str, Any], assets: list[Any], duration: float) -> tuple[list[str], str]:
        asset_paths = {
            str(asset.get("assetId")): str(asset.get("assetPath"))
            for asset in assets
            if isinstance(asset, dict) and asset.get("assetType") == "voice" and asset.get("assetId") and asset.get("assetPath")
        }
        clips: list[tuple[str, float, float]] = []
        for action in _as_list(scene.get("actions")):
            if not isinstance(action, dict) or action.get("actionType") != "talk":
                continue
            payload = _as_dict(action.get("payload", {}))
            voice_candidates: list[str] = []
            generated_voice_path = _optional_string(payload.get("generatedVoicePath"))
            if generated_voice_path is not None:
                voice_candidates.append(generated_voice_path)
            voice_asset_id = _optional_string(payload.get("voiceAssetId"))
            if voice_asset_id is not None:
                asset_path = asset_paths.get(voice_asset_id)
                if asset_path is not None and asset_path not in voice_candidates:
                    voice_candidates.append(asset_path)
            if not voice_candidates:
                continue
            start = _clamp(float(action.get("startTime", 0)), 0, duration)
            end = _clamp(float(action.get("endTime", start)), start, duration)
            if end <= start:
                continue
            resolved = self._resolve_existing_audio_file(project_root, voice_candidates)
            clips.append((str(resolved), start, end))

        clips.sort(key=lambda clip: (clip[1], clip[0]))
        audio_inputs: list[str] = []
        filters = [f"[1:a]atrim=0:{_format_number(duration)},asetpts=PTS-STARTPTS[silence]"]
        labels = ["[silence]"]
        for index, (path, start, end) in enumerate(clips):
            audio_inputs.extend(["-i", path])
            input_index = index + 2
            label = f"[voice{index}]"
            delay_ms = round(start * 1000)
            filters.append(
                f"[{input_index}:a]atrim=0:{_format_number(end - start)},asetpts=PTS-STARTPTS,adelay={delay_ms}|{delay_ms}{label}"
            )
            labels.append(label)
        filters.append(
            f"{''.join(labels)}amix=inputs={len(labels)}:duration=longest:dropout_transition=0,atrim=0:{_format_number(duration)},asetpts=PTS-STARTPTS[aout]"
        )
        return audio_inputs, ";".join(filters)

    def _resolve_project_root(self, project_id: str) -> Path:
        if project_id.strip() == "" or "/" in project_id or "\\" in project_id or project_id in {".", ".."}:
            raise ValueError("Project id is invalid.")
        root = (self._repository_root / "projects" / project_id).resolve()
        root.mkdir(parents=True, exist_ok=True)
        return root

    def _resolve_existing_audio_file(self, project_root: Path, relative_paths: list[str]) -> Path:
        candidates: list[Path] = []
        for relative_path in relative_paths:
            for candidate in self._audio_file_candidates(project_root, relative_path):
                if candidate not in candidates:
                    candidates.append(candidate)

        for candidate in candidates:
            if candidate.is_file():
                return candidate

        if candidates:
            return candidates[0]

        raise ValueError("MP4 export audio path is required.")

    def _audio_file_candidates(self, project_root: Path, relative_path: str) -> list[Path]:
        """Resolve Talk Action voice paths.

        Current voice generation stores project-local paths under
        `projects/{projectId}/voices/...`. Older builds sometimes kept the
        stale value `projects/voices/...` in generatedVoicePath / assetPath.
        When that legacy value is present, prefer the same file under the
        current project folder so MP4 export uses the voice the user just
        generated for this project.
        """
        normalized = _normalize_relative_path(relative_path)

        if len(normalized.parts) >= 3 and normalized.parts[0] == "projects" and normalized.parts[1] == "voices":
            return [
                self._resolve_project_file(project_root, Path("voices", *normalized.parts[2:]).as_posix()),
                self._resolve_repository_projects_file(normalized),
            ]

        if len(normalized.parts) >= 2 and normalized.parts[0] == "projects":
            return [self._resolve_repository_projects_file(normalized)]

        return [self._resolve_project_file(project_root, relative_path)]

    def _resolve_repository_projects_file(self, relative_path: Path) -> Path:
        resolved = (self._repository_root / relative_path).resolve()
        projects_root = (self._repository_root / "projects").resolve()
        try:
            resolved.relative_to(projects_root)
        except ValueError as exc:
            raise ValueError("MP4 export audio path must stay inside the projects folder.") from exc
        return resolved

    @staticmethod
    def _resolve_project_file(project_root: Path, relative_path: str) -> Path:
        normalized = _normalize_relative_path(relative_path)
        resolved = (project_root / normalized).resolve()
        try:
            resolved.relative_to(project_root)
        except ValueError as exc:
            raise ValueError("MP4 export path must stay inside the project folder.") from exc
        return resolved


def _required_executable(command: str) -> str:
    resolved = shutil.which(command)
    if resolved is None:
        raise FileNotFoundError("FFmpeg is not available. Install FFmpeg and make sure the ffmpeg command is on PATH.")
    version = subprocess.run([resolved, "-version"], capture_output=True, text=True, check=False)
    if version.returncode != 0:
        detail = version.stderr.strip()
        raise FileNotFoundError(
            "FFmpeg is not available. Install FFmpeg and make sure the ffmpeg command is on PATH."
            + (f" Details: {detail}" if detail else "")
        )
    return resolved


def _normalize_relative_path(path: str) -> Path:
    normalized = path.replace("\\", "/").strip().strip("/")
    if normalized == "":
        raise ValueError("MP4 export path is required.")
    candidate = Path(normalized)
    if candidate.is_absolute() or ".." in candidate.parts or "." in candidate.parts:
        raise ValueError("MP4 export path must stay inside the project folder.")
    return candidate


def _relative_to_project(project_root: Path, path: Path) -> str:
    return path.resolve().relative_to(project_root).as_posix()


def _relative_command_item(project_root: Path, item: str) -> str:
    try:
        return Path(item).resolve().relative_to(project_root).as_posix()
    except (ValueError, OSError):
        return item


def _required_string(payload: dict[str, Any], key: str) -> str:
    value = payload.get(key)
    if not isinstance(value, str) or value.strip() == "":
        raise ValueError(f"MP4 export {key} is required.")
    return value


def _optional_string(value: Any) -> str | None:
    return value if isinstance(value, str) and value.strip() != "" else None


def _positive_number(value: Any, name: str) -> float:
    if not isinstance(value, (int, float)) or value <= 0:
        raise ValueError(f"MP4 export {name} must be a positive number.")
    return float(value)


def _as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _format_number(value: float) -> str:
    return str(int(value)) if float(value).is_integer() else f"{value:.3f}".rstrip("0").rstrip(".")


def _clamp(value: float, lower: float, upper: float) -> float:
    return min(max(value, lower), upper)
