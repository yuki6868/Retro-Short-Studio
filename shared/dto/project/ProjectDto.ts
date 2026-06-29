import type { AssetDto } from "../asset/AssetDto";
import type { CharacterDto } from "../character/CharacterDto";
import type { SceneDto } from "../scene/SceneDto";

export type ProjectSettingsDto = {
  width: number;
  height: number;
  fps: number;
};

export type ProjectDto = {
  projectId: string;
  projectName: string;
  settings: ProjectSettingsDto;
  assets: AssetDto[];
  characters: CharacterDto[];
  scenes: SceneDto[];
};
