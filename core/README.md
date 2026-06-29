# core

Core owns the pure Retro Short Studio project world model.

Rules:

- Do not import from `frontend`, `app`, `engine`, `storage`, or `shared`.
- Do not depend on Pyxel, VOICEVOX, ffmpeg, React, or file-system APIs.
- Keep project editing rules here only when they are domain invariants.
- Put application workflows in `app`, persistence in `storage`, and rendering/export in `engine`.
