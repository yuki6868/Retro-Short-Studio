import type { ActionDto } from "../action/ActionDto";
import type { CharacterInstanceDto } from "../scene/SceneDto";

export type SceneTemplateDto = {
  templateId: string;
  templateName: string;
  sourceSceneId: string;
  scene: {
    duration: number;
    backgroundAssetId: string | null;
    characters: CharacterInstanceDto[];
    actions: ActionDto[];
  };
};
