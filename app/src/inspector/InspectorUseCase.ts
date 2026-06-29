import type { ActionSnapshot, Project, SceneSnapshot } from "../../../core/src";
import type { CharacterModelSnapshot } from "../../../core/src";
import type { ActionDto, SceneDto } from "../../../shared";
import { SelectionState, type SelectionTarget } from "./SelectionState";

export type InspectorPanelType = "empty" | "scene" | "character" | "action";

export type EmptyInspectorPanelState = {
  type: "empty";
  title: "Inspector";
  message: string;
  selectedTargetLabel: "Nothing selected";
};

export type SceneInspectorPanelState = {
  type: "scene";
  title: "Scene Inspector";
  selectedTargetLabel: string;
  scene: SceneDto;
  editableFields: ["sceneName", "duration", "backgroundAssetId"];
};

export type CharacterInspectorPanelState = {
  type: "character";
  title: "Character Inspector";
  selectedTargetLabel: string;
  character: {
    characterId: string;
    characterName: string;
    defaultExpression: string;
    defaultEye: string;
    defaultMouth: string;
    defaultMotion: string;
  };
  editableFields: ["characterName", "defaultExpression", "defaultEye", "defaultMouth", "defaultMotion"];
};

export type ActionInspectorPanelState = {
  type: "action";
  title: "Action Inspector";
  selectedTargetLabel: string;
  action: ActionDto & { sceneId: string };
  editableFields: ["startTime", "endTime", "targetId", "payload"];
};

export type InspectorPanelState =
  | EmptyInspectorPanelState
  | SceneInspectorPanelState
  | CharacterInspectorPanelState
  | ActionInspectorPanelState;

export type RenameSceneInput = {
  sceneId: string;
  sceneName: string;
};

export type ChangeSceneDurationInput = {
  sceneId: string;
  duration: number;
};

export type RenameCharacterInput = {
  characterId: string;
  characterName: string;
};

export type ChangeActionTimeRangeInput = {
  sceneId: string;
  actionId: string;
  startTime: number;
  endTime: number;
};

export type InspectorState = {
  selection: SelectionTarget;
  panel: InspectorPanelState;
};

export type InspectorUseCaseConfig = {
  project: Project;
};

export class InspectorUseCase {
  private selection = SelectionState.empty();

  constructor(private readonly config: InspectorUseCaseConfig) {}

  get state(): InspectorState {
    return this.createState();
  }

  clearSelection(): InspectorState {
    this.selection = SelectionState.empty();
    return this.createState();
  }

  selectScene(sceneId: string): InspectorState {
    const normalizedSceneId = normalizeId(sceneId, "sceneId");
    this.findSceneOrThrow(normalizedSceneId);
    this.selection = SelectionState.scene(normalizedSceneId);
    return this.createState();
  }

  selectCharacter(characterId: string): InspectorState {
    const normalizedCharacterId = normalizeId(characterId, "characterId");
    this.findCharacterOrThrow(normalizedCharacterId);
    this.selection = SelectionState.character(normalizedCharacterId);
    return this.createState();
  }

  selectAction(sceneId: string, actionId: string): InspectorState {
    const normalizedSceneId = normalizeId(sceneId, "sceneId");
    const normalizedActionId = normalizeId(actionId, "actionId");
    this.findActionOrThrow(normalizedSceneId, normalizedActionId);
    this.selection = SelectionState.action(normalizedSceneId, normalizedActionId);
    return this.createState();
  }

  renameSelectedScene(input: RenameSceneInput): InspectorState {
    const sceneId = normalizeId(input.sceneId, "sceneId");
    this.config.project.updateScene(sceneId, (scene) => scene.rename(input.sceneName));
    this.selection = SelectionState.scene(sceneId);
    return this.createState();
  }

  changeSelectedSceneDuration(input: ChangeSceneDurationInput): InspectorState {
    const sceneId = normalizeId(input.sceneId, "sceneId");
    this.config.project.updateScene(sceneId, (scene) => scene.changeDuration(input.duration));
    this.selection = SelectionState.scene(sceneId);
    return this.createState();
  }

  renameSelectedCharacter(input: RenameCharacterInput): InspectorState {
    const characterId = normalizeId(input.characterId, "characterId");
    this.config.project.updateCharacterModel(characterId, (character) => character.rename(input.characterName));
    this.selection = SelectionState.character(characterId);
    return this.createState();
  }

  changeSelectedActionTimeRange(input: ChangeActionTimeRangeInput): InspectorState {
    const sceneId = normalizeId(input.sceneId, "sceneId");
    const actionId = normalizeId(input.actionId, "actionId");
    this.config.project.updateScene(sceneId, (scene) => {
      scene.updateAction(actionId, (action) => action.changeTimeRange(input.startTime, input.endTime));
    });
    this.selection = SelectionState.action(sceneId, actionId);
    return this.createState();
  }

  private createState(): InspectorState {
    return {
      selection: this.selection.toTarget(),
      panel: this.createPanelState(),
    };
  }

  private createPanelState(): InspectorPanelState {
    const target = this.selection.toTarget();

    if (target.type === "scene") {
      const scene = this.findSceneOrThrow(target.sceneId);
      return {
        type: "scene",
        title: "Scene Inspector",
        selectedTargetLabel: `Scene: ${scene.sceneName}`,
        scene: toSceneDto(scene),
        editableFields: ["sceneName", "duration", "backgroundAssetId"],
      };
    }

    if (target.type === "character") {
      const character = this.findCharacterOrThrow(target.characterId);
      return {
        type: "character",
        title: "Character Inspector",
        selectedTargetLabel: `Character: ${character.characterName}`,
        character: {
          characterId: character.characterId,
          characterName: character.characterName,
          defaultExpression: character.defaultExpression,
          defaultEye: character.defaultEye,
          defaultMouth: character.defaultMouth,
          defaultMotion: character.defaultMotion,
        },
        editableFields: ["characterName", "defaultExpression", "defaultEye", "defaultMouth", "defaultMotion"],
      };
    }

    if (target.type === "action") {
      const action = this.findActionOrThrow(target.sceneId, target.actionId);
      return {
        type: "action",
        title: "Action Inspector",
        selectedTargetLabel: `Action: ${action.actionType}`,
        action: { ...toActionDto(action), sceneId: target.sceneId },
        editableFields: ["startTime", "endTime", "targetId", "payload"],
      };
    }

    return {
      type: "empty",
      title: "Inspector",
      message: "Select a scene, character, or action to edit it.",
      selectedTargetLabel: "Nothing selected",
    };
  }

  private findSceneOrThrow(sceneId: string): SceneSnapshot {
    const scene = this.config.project.toSnapshot().scenes.find((candidate) => candidate.sceneId === sceneId);

    if (scene === undefined) {
      throw new Error(`Scene does not exist: ${sceneId}.`);
    }

    return scene;
  }

  private findCharacterOrThrow(characterId: string): CharacterModelSnapshot {
    const character = this.config.project.toSnapshot().characters.find(
      (candidate) => candidate.characterId === characterId,
    );

    if (character === undefined) {
      throw new Error(`Character does not exist: ${characterId}.`);
    }

    return character;
  }

  private findActionOrThrow(sceneId: string, actionId: string): ActionSnapshot {
    const scene = this.findSceneOrThrow(sceneId);
    const action = scene.actions.find((candidate) => candidate.actionId === actionId);

    if (action === undefined) {
      throw new Error(`Action does not exist in scene ${sceneId}: ${actionId}.`);
    }

    return action;
  }
}

function toSceneDto(scene: SceneSnapshot): SceneDto {
  return {
    sceneId: scene.sceneId,
    sceneName: scene.sceneName,
    duration: scene.duration,
    backgroundAssetId: scene.backgroundAssetId,
    characterIds: scene.characters.map((character) => character.characterId),
    actions: scene.actions.map(toActionDto),
  };
}

function toActionDto(action: ActionSnapshot): ActionDto {
  return {
    actionId: action.actionId,
    actionType: action.actionType as ActionDto["actionType"],
    startTime: action.startTime,
    endTime: action.endTime,
    targetId: action.targetId,
    payload: { ...action.payload },
  };
}

function normalizeId(value: string, name: string): string {
  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    throw new Error(`Inspector ${name} is required.`);
  }

  return normalizedValue;
}
