from __future__ import annotations

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]


def read(relative_path: str) -> str:
    return (ROOT / relative_path).read_text(encoding="utf-8")


def read_json(relative_path: str):
    import json

    return json.loads(read(relative_path))


def ts_files(layer: str):
    return sorted((ROOT / layer).rglob("*.ts"))


def imports_from(source: str):
    pattern = re.compile(r"^\s*import(?:\s+type)?\s+.*?from\s+[\"']([^\"']+)[\"'];?", re.MULTILINE)
    return pattern.findall(source)


def export_targets(source: str):
    pattern = re.compile(r"^\s*export(?:\s+type)?\s+.*?from\s+[\"']([^\"']+)[\"'];?", re.MULTILINE)
    return pattern.findall(source)


def extract_block_after(source: str, marker: str) -> str:
    start = source.find(marker)
    assert start != -1, f"marker not found: {marker}"
    brace_start = source.find("{", start)
    assert brace_start != -1, f"opening brace not found after marker: {marker}"

    depth = 0
    for index in range(brace_start, len(source)):
        char = source[index]
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return source[brace_start + 1:index]

    raise AssertionError(f"closing brace not found after marker: {marker}")


def assert_contains_in_order(source: str, expected_parts: list[str]) -> None:
    cursor = 0
    for expected in expected_parts:
        next_index = source.find(expected, cursor)
        assert next_index != -1, f"expected part not found after index {cursor}: {expected}"
        cursor = next_index + len(expected)
