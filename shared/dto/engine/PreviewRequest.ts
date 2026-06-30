import type { AssetDto } from "../asset/AssetDto";
import type { CharacterDto } from "../character/CharacterDto";
import type { SceneDto } from "../scene/SceneDto";

export type PreviewRequest = {
  projectId: string;
  scene: SceneDto;
  assets?: AssetDto[];
  characters?: CharacterDto[];
  currentTime: number;
  width: number;
  height: number;
  fps: number;
};

export type PreviewResult = {
  framePath: string | null;
  currentTime: number;
  width: number;
  height: number;
};
