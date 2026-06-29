import type { ActionDto } from "../action/ActionDto";

export type SceneDto = {
  sceneId: string;
  sceneName: string;
  duration: number;
  backgroundAssetId: string | null;
  characterIds: string[];
  actions: ActionDto[];
};
