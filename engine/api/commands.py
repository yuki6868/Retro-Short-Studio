from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

EngineCommand = Literal["preview", "render", "voice", "export"]


@dataclass(frozen=True)
class EngineRequest:
    """Command sent to the Python engine boundary.

    The payload is intentionally dictionary-shaped because the canonical
    contract is owned by shared DTOs. Python adapters can validate details
    when each concrete feature is implemented.
    """

    command_id: str
    command: EngineCommand
    payload: dict[str, Any]


@dataclass(frozen=True)
class EngineResult:
    """Command result returned by the Python engine boundary."""

    command_id: str
    ok: bool
    payload: dict[str, Any] | None
    error: str | None

    @staticmethod
    def success(command_id: str, payload: dict[str, Any]) -> "EngineResult":
        return EngineResult(command_id=command_id, ok=True, payload=payload, error=None)

    @staticmethod
    def failure(command_id: str, error: str) -> "EngineResult":
        return EngineResult(command_id=command_id, ok=False, payload=None, error=error)
