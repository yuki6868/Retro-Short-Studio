import type { ActionDto } from "../action/ActionDto";

export type CharacterInstanceDto = {
  instanceId: string;
  characterId: string;
  transform: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
  };
  expression: string;
  eye: string;
  mouth: string;
  motion: string;
};

export type SceneDto = {
  sceneId: string;
  sceneName: string;
  duration: number;
  backgroundAssetId: string | null;
  characterIds: string[];
  characters?: CharacterInstanceDto[];
  actions: ActionDto[];
};
