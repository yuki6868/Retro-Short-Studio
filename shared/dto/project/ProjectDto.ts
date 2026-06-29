import type { AssetDto } from "../asset/AssetDto";
import type { CharacterDto } from "../character/CharacterDto";
import type { SceneDto } from "../scene/SceneDto";

export type ProjectSettingsDto = {
  width: number;
  height: number;
  fps: number;
};

export const CURRENT_PROJECT_SCHEMA_VERSION = 1 as const;

export type ProjectSchemaVersionDto = typeof CURRENT_PROJECT_SCHEMA_VERSION;

export type ProjectDto = {
  schemaVersion: ProjectSchemaVersionDto;
  projectId: string;
  projectName: string;
  settings: ProjectSettingsDto;
  assets: AssetDto[];
  characters: CharacterDto[];
  scenes: SceneDto[];
};
