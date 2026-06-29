# Retro Short Studio

Retro Short Studio is a local production studio for making retro-style short videos.

This repository intentionally separates the studio into explicit boundaries.

## Directory responsibilities

- `frontend/`
  React / TypeScript UI. Owns the production experience: layout, preview panel, timeline, inspector, asset browser, and scene flow.

- `core/`
  Pure project world model. Owns Project, Scene, Character, Asset, Action, Template, and Settings. It must not depend on Pyxel, VOICEVOX, ffmpeg, React, or storage details.

- `app/`
  UseCase layer. Connects frontend operations to core, engine, and storage boundaries.

- `engine/`
  Python engine area. Owns rendering, voice generation, lip-sync analysis, and export adapters. It must not edit Project state directly.

- `shared/`
  DTOs, JSON Schema, and API contracts used across boundaries.

- `storage/`
  ProjectRepository boundary and storage implementations. The first implementation will be local project-folder JSON storage.

- `projects/`
  Local project workspace. One work should be saved as one folder.

- `assets/`
  Shared development assets and samples.

## Current commit scope

This commit adds Project Core as the pure project world root.

It does not add Asset Core, Scene Core, Character Core, UseCases, Pyxel, VOICEVOX, ffmpeg export, SQLite, Cloud storage, or production UI yet.
