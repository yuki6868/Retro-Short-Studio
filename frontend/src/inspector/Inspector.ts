import type {
  ChangeActionTimeRangeInput,
  ChangeSceneDurationInput,
  InspectorState,
  RenameCharacterInput,
  RenameSceneInput,
} from "../../../app/src";

export type InspectorUseCase = {
  readonly state: InspectorState;
  clearSelection(): InspectorState;
  selectScene(sceneId: string): InspectorState;
  selectCharacter(characterId: string): InspectorState;
  selectAction(sceneId: string, actionId: string): InspectorState;
  renameSelectedScene(input: RenameSceneInput): InspectorState;
  changeSelectedSceneDuration(input: ChangeSceneDurationInput): InspectorState;
  renameSelectedCharacter(input: RenameCharacterInput): InspectorState;
  changeSelectedActionTimeRange(input: ChangeActionTimeRangeInput): InspectorState;
};

export type InspectorProps = {
  title?: string;
  inspector: InspectorUseCase;
};

export type EmptyInspectorViewState = {
  type: "empty";
  title: string;
  selectedTargetLabel: "Nothing selected";
  message: string;
};

export type SceneInspectorViewState = {
  type: "scene";
  title: string;
  selectedTargetLabel: string;
  sceneId: string;
  sceneName: string;
  duration: number;
  backgroundAssetId: string | null;
  fields: ["sceneName", "duration", "backgroundAssetId"];
};

export type CharacterInspectorViewState = {
  type: "character";
  title: string;
  selectedTargetLabel: string;
  characterId: string;
  characterName: string;
  defaultExpression: string;
  defaultEye: string;
  defaultMouth: string;
  defaultMotion: string;
  fields: ["characterName", "defaultExpression", "defaultEye", "defaultMouth", "defaultMotion"];
};

export type ActionInspectorViewState = {
  type: "action";
  title: string;
  selectedTargetLabel: string;
  sceneId: string;
  actionId: string;
  actionType: string;
  startTime: number;
  endTime: number;
  targetId: string | null;
  payloadPreview: string;
  fields: ["startTime", "endTime", "targetId", "payload"];
};

export type InspectorViewState =
  | EmptyInspectorViewState
  | SceneInspectorViewState
  | CharacterInspectorViewState
  | ActionInspectorViewState;

export class Inspector {
  private latestState: InspectorState;

  constructor(private readonly props: InspectorProps) {
    this.latestState = props.inspector.state;
  }

  render(): InspectorViewState {
    const panel = this.latestState.panel;

    if (panel.type === "scene") {
      return {
        type: "scene",
        title: this.props.title ?? panel.title,
        selectedTargetLabel: panel.selectedTargetLabel,
        sceneId: panel.scene.sceneId,
        sceneName: panel.scene.sceneName,
        duration: panel.scene.duration,
        backgroundAssetId: panel.scene.backgroundAssetId,
        fields: panel.editableFields,
      };
    }

    if (panel.type === "character") {
      return {
        type: "character",
        title: this.props.title ?? panel.title,
        selectedTargetLabel: panel.selectedTargetLabel,
        characterId: panel.character.characterId,
        characterName: panel.character.characterName,
        defaultExpression: panel.character.defaultExpression,
        defaultEye: panel.character.defaultEye,
        defaultMouth: panel.character.defaultMouth,
        defaultMotion: panel.character.defaultMotion,
        fields: panel.editableFields,
      };
    }

    if (panel.type === "action") {
      return {
        type: "action",
        title: this.props.title ?? panel.title,
        selectedTargetLabel: panel.selectedTargetLabel,
        sceneId: panel.action.sceneId,
        actionId: panel.action.actionId,
        actionType: panel.action.actionType,
        startTime: panel.action.startTime,
        endTime: panel.action.endTime,
        targetId: panel.action.targetId,
        payloadPreview: JSON.stringify(panel.action.payload),
        fields: panel.editableFields,
      };
    }

    return {
      type: "empty",
      title: this.props.title ?? panel.title,
      selectedTargetLabel: panel.selectedTargetLabel,
      message: panel.message,
    };
  }

  editSceneName(sceneId: string, sceneName: string): InspectorViewState {
    this.latestState = this.props.inspector.renameSelectedScene({ sceneId, sceneName });
    return this.render();
  }

  editSceneDuration(sceneId: string, duration: number): InspectorViewState {
    this.latestState = this.props.inspector.changeSelectedSceneDuration({ sceneId, duration });
    return this.render();
  }

  editCharacterName(characterId: string, characterName: string): InspectorViewState {
    this.latestState = this.props.inspector.renameSelectedCharacter({ characterId, characterName });
    return this.render();
  }

  editActionTimeRange(input: ChangeActionTimeRangeInput): InspectorViewState {
    this.latestState = this.props.inspector.changeSelectedActionTimeRange(input);
    return this.render();
  }

  selectScene(sceneId: string): InspectorViewState {
    this.latestState = this.props.inspector.selectScene(sceneId);
    return this.render();
  }

  selectCharacter(characterId: string): InspectorViewState {
    this.latestState = this.props.inspector.selectCharacter(characterId);
    return this.render();
  }

  selectAction(sceneId: string, actionId: string): InspectorViewState {
    this.latestState = this.props.inspector.selectAction(sceneId, actionId);
    return this.render();
  }
}
