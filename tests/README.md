# Retro Short Studio pytest

These tests are structural tests for the TypeScript source files created through Commit 4.

Run them from the `Retro-Short-Studio` project root with the project virtual environment:

```bash
source .venv/bin/activate
python -m pytest -q
```

VS Code should open the `Retro-Short-Studio` folder itself as the workspace root.
The workspace settings point test discovery at `${workspaceFolder}/.venv/bin/python` and `${workspaceFolder}/tests`.
