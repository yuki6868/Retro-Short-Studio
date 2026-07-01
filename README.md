# Retro Short Studio

Retro Short Studio is a local production studio for creating retro-style short videos.

This repository intentionally separates the studio into explicit architectural boundaries.

---

# Directory Responsibilities

## frontend/

React + TypeScript UI.

Responsible for:

- Studio Layout
- Preview Panel
- Timeline
- Inspector
- Asset Browser
- Scene Flow

The frontend must not contain rendering, VOICEVOX, or export logic.

---

## core/

Pure domain model.

Owns:

- Project
- Scene
- Character
- Asset
- Action
- Template
- Settings

The Core must never depend on:

- React
- Pyxel
- VOICEVOX
- ffmpeg
- Storage implementations

---

## app/

UseCase layer.

Responsible for connecting:

Frontend

↓

Core

↓

Engine / Storage

---

## engine/

Python production engine.

Responsible for:

- Rendering
- Voice generation
- Lip Sync
- Export

The engine never edits Project state directly.

---

## shared/

Shared DTOs, JSON Schema, and API contracts.

---

## storage/

Storage boundary.

Owns:

- ProjectRepository
- LocalJsonProjectRepository

Future implementations:

- SQLite
- Cloud
- PostgreSQL

---

## projects/

Local workspace.

Each project is stored as its own folder.

Example:

```
projects/
└── my-project/
    ├── project.rss.json
    ├── assets/
    ├── voices/
    ├── renders/
    └── exports/
```

---

## assets/

Shared development assets and samples.

---

# Development Environment

The repository assumes the following workspace structure.

```
retro_short_studio/
├── .venv/
├── VOICEVOX/
└── Retro-Short-Studio/
```

- `.venv` is shared by the project.
- `VOICEVOX` is placed next to the Git repository.
- The VOICEVOX directory is **not** included in Git.

---

# Local Development

## Backend

From the repository root:

```bash
chmod +x dev-backend.sh
./dev-backend.sh
```

The script automatically:

- Uses the shared `.venv`
- Starts FastAPI
- Enables auto reload

Internally it executes:

```bash
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

using the Python interpreter in:

```
../.venv/
```

---

## Frontend

```bash
npm install
npm run dev
```

---

## Python Tests

```bash
python -m pytest -q
```

---

## Frontend Tests

```bash
npm test
```

---

# Preview Flow

```
React Preview Panel
        │
        ▼
FastAPI
/api/preview/frame
        │
        ▼
EngineApp
        │
        ▼
Pyxel Renderer
```

---

# Voice Generation Flow

```
Talk Action
        │
        ▼
GenerateVoiceUseCase
        │
        ▼
VoiceProvider
        │
        ▼
VoiceVoxCoreProvider
        │
        ▼
VOICEVOX
        │
        ▼
projects/<project>/voices/*.wav
```

The current implementation uses the local `voicevox_core` library.

The VOICEVOX resources are loaded from the sibling directory:

```
retro_short_studio/
└── VOICEVOX/
```

HTTP-based VOICEVOX integration is reserved for future providers.

---

# Current Commit Scope

Current progress includes:

- Project Core
- Asset Core
- Scene Core
- Character Core
- Action Core
- Timeline Core
- Pyxel Preview
- Local VOICEVOX Core integration

Not yet implemented:

- SQLite
- Cloud Storage
- AI Providers
- Live2D
- 3D
- Advanced Particle Effects
- Full Video Editor Timeline