#!/usr/bin/env bash

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKSPACE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${SCRIPT_DIR}/backend"

exec "${WORKSPACE_ROOT}/.venv/bin/python" \
  -m uvicorn app.main:app \
  --reload \
  --host 127.0.0.1 \
  --port 8000