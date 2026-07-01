from __future__ import annotations

import importlib
import wave
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .voice_provider import VoiceProvider, VoiceRequest, VoiceResult
from .voicevox_locator import VoiceVoxInstallation, VoiceVoxLocator


@dataclass(frozen=True)
class VoiceVoxCorePaths:
    """Resolved local files required by voicevox_core.

    The files themselves are intentionally installed outside this Git
    repository. Retro Short Studio only stores the code that references them.
    """

    root: Path
    dictionary_dir: Path
    onnxruntime_library: Path
    vvm_dir: Path

    @classmethod
    def from_root(cls, root: Path) -> "VoiceVoxCorePaths":
        return cls(
            root=root,
            dictionary_dir=root / "dict" / "open_jtalk_dic_utf_8-1.11",
            onnxruntime_library=root / "onnxruntime" / "lib" / "libvoicevox_onnxruntime.1.17.3.dylib",
            vvm_dir=root / "models" / "vvms",
        )

    def validate(self) -> None:
        missing = [
            str(path)
            for path in [self.dictionary_dir, self.onnxruntime_library, self.vvm_dir]
            if not path.exists()
        ]
        if missing:
            raise FileNotFoundError("VOICEVOX local runtime is incomplete: " + ", ".join(missing))
        if not any(self.vvm_dir.glob("*.vvm")):
            raise FileNotFoundError(f"VOICEVOX voice models were not found under {self.vvm_dir}")


class VoiceVoxCoreProvider(VoiceProvider):
    """VoiceProvider implementation backed by local voicevox_core files.

    Expected layout:

        retro_short_studio/
        ├── Retro-Short-Studio/
        └── VOICEVOX/
            ├── dict/open_jtalk_dic_utf_8-1.11/
            ├── models/vvms/*.vvm
            └── onnxruntime/lib/libvoicevox_onnxruntime.1.17.3.dylib

    VOICEVOX-specific imports and runtime paths stay inside this adapter.
    Core, App, Frontend, and the generic Engine dispatcher only see the
    VoiceProvider boundary.
    """

    def __init__(
        self,
        installation: VoiceVoxInstallation | None = None,
        paths: VoiceVoxCorePaths | None = None,
        core_module: Any | None = None,
    ) -> None:
        resolved_installation = installation or VoiceVoxLocator().find()
        if paths is None:
            if resolved_installation is None:
                raise FileNotFoundError("VOICEVOX was not found next to Retro-Short-Studio.")
            paths = VoiceVoxCorePaths.from_root(resolved_installation.path)
        paths.validate()

        self._paths = paths
        self._core_module = core_module
        self._synthesizer: Any | None = None

    @property
    def paths(self) -> VoiceVoxCorePaths:
        return self._paths

    def generate(self, request: VoiceRequest) -> VoiceResult:
        style_id = _style_id(request.speaker_id)
        synthesizer = self._get_synthesizer()
        wav_bytes = synthesizer.tts(request.text, style_id=style_id)

        output_path = Path(request.output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(wav_bytes)

        return VoiceResult(
            voice_asset_id=None,
            wav_path=str(output_path),
            duration=_wav_duration(output_path),
        )

    def _get_synthesizer(self) -> Any:
        if self._synthesizer is None:
            self._synthesizer = self._create_synthesizer()
        return self._synthesizer

    def _create_synthesizer(self) -> Any:
        core = self._core_module or importlib.import_module("voicevox_core.blocking")

        onnxruntime = core.Onnxruntime.load_once(filename=str(self._paths.onnxruntime_library))
        open_jtalk = _create_open_jtalk(core, self._paths.dictionary_dir)
        synthesizer = core.Synthesizer(onnxruntime, open_jtalk)

        for model_path in sorted(self._paths.vvm_dir.glob("*.vvm")):
            with core.VoiceModelFile.open(str(model_path)) as voice_model:
                synthesizer.load_voice_model(voice_model)

        return synthesizer


def _create_open_jtalk(core: Any, dictionary_dir: Path) -> Any:
    try:
        return core.OpenJtalk(open_jtalk_dict_dir=str(dictionary_dir))
    except TypeError:
        return core.OpenJtalk(str(dictionary_dir))


def _style_id(value: str) -> int:
    stripped = value.strip()
    if stripped == "":
        raise ValueError("VoiceRequest.speaker_id is required.")
    try:
        return int(stripped)
    except ValueError as error:
        raise ValueError("VoiceRequest.speaker_id must be a numeric VOICEVOX style_id for local core generation.") from error


def _wav_duration(path: Path) -> float:
    try:
        with wave.open(str(path), "rb") as wav_file:
            frame_rate = wav_file.getframerate()
            if frame_rate <= 0:
                return 0
            return wav_file.getnframes() / frame_rate
    except (wave.Error, OSError, EOFError):
        return 0
