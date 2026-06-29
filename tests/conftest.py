"""Pytest path setup for the Python engine package.

VSCode may discover tests from the parent workspace directory, so the
repository root is not always on sys.path during collection. Keep this local to
pytest instead of requiring users to export PYTHONPATH manually.
"""

from __future__ import annotations

import sys
from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
repository_root_path = str(REPOSITORY_ROOT)

if repository_root_path not in sys.path:
    sys.path.insert(0, repository_root_path)
