import { describe, expect, it } from "vitest";

import type {
  ChangeActionPayloadInput,
  ChangeActionTargetInput,
  ChangeActionTimeRangeInput,
  ChangeSceneBackgroundInput,
  ChangeSceneDurationInput,
  InspectorState,
  RenameCharacterInput,
  RenameSceneInput,
} from "../../app/src";
import { Inspector, type InspectorUseCase } from "../../frontend/src";

describe("Inspector", () => {
  it("renders an empty inspector without becoming a universal form", () => {
    const inspector = new Inspector({ inspector: createInspectorUseCase(emptyState()) });

    const view = inspector.render();

    expect(view).toMatchObject({
      type: "empty",
      title: "Inspector",
      selectedTargetLabel: "Nothing selected",
    });
    expect(Object.keys(view)).not.toContain("fields");
  });

  it("renders a SceneInspector with only scene fields", () => {
    const inspector = new Inspector({ inspector: createInspectorUseCase(sceneState()) });

    const view = inspector.render();

    expect(view).toMatchObject({
      type: "scene",
      title: "Scene Inspector",
      selectedTargetLabel: "Scene: Opening",
      sceneName: "Opening",
      duration: 6,
      fields: ["sceneName", "duration", "backgroundAssetId"],
    });
    expect(Object.keys(view)).not.toContain("characterName");
  });

  it("delegates scene edits to the Inspector use case", () => {
    const renameCalls: RenameSceneInput[] = [];
    const durationCalls: ChangeSceneDurationInput[] = [];
    const backgroundCalls: ChangeSceneBackgroundInput[] = [];
    const inspector = new Inspector({
      inspector: createInspectorUseCase(sceneState(), {
        renameSelectedScene: (input) => {
          renameCalls.push(input);
          return sceneState({ sceneName: input.sceneName });
        },
        changeSelectedSceneDuration: (input) => {
          durationCalls.push(input);
          return sceneState({ duration: input.duration });
        },
        changeSelectedSceneBackground: (input) => {
          backgroundCalls.push(input);
          return sceneState({ backgroundAssetId: input.backgroundAssetId });
        },
      }),
    });

    expect(inspector.editSceneName("scene-1", "Hook")).toMatchObject({ type: "scene", sceneName: "Hook" });
    expect(inspector.editSceneDuration("scene-1", 9)).toMatchObject({ type: "scene", duration: 9 });
    expect(inspector.editSceneBackground("scene-1", "asset-bg-1")).toMatchObject({
      type: "scene",
      backgroundAssetId: "asset-bg-1",
    });
    expect(renameCalls).toEqual([{ sceneId: "scene-1", sceneName: "Hook" }]);
    expect(durationCalls).toEqual([{ sceneId: "scene-1", duration: 9 }]);
    expect(backgroundCalls).toEqual([{ sceneId: "scene-1", backgroundAssetId: "asset-bg-1" }]);
  });

  it("switches between CharacterInspector and ActionInspector using SelectionState from the use case", () => {
    const inspector = new Inspector({
      inspector: createInspectorUseCase(emptyState(), {
        selectCharacter: () => characterState(),
        selectAction: () => actionState(),
      }),
    });

    expect(inspector.selectCharacter("character-1")).toMatchObject({
      type: "character",
      title: "Character Inspector",
      characterName: "Zundamon",
      fields: ["characterName", "defaultExpression", "defaultEye", "defaultMouth", "defaultMotion"],
    });
    expect(inspector.selectAction("scene-1", "action-1")).toMatchObject({
      type: "action",
      title: "Action Inspector",
      actionType: "talk",
      payload: { text: "Hello" },
      payloadPreview: JSON.stringify({ text: "Hello" }),
      fields: ["startTime", "endTime", "targetId", "payload"],
    });
  });

  it("delegates character and action edits instead of editing Project data in the frontend", () => {
    const characterCalls: RenameCharacterInput[] = [];
    const actionCalls: ChangeActionTimeRangeInput[] = [];
    const targetCalls: ChangeActionTargetInput[] = [];
    const payloadCalls: ChangeActionPayloadInput[] = [];
    const inspector = new Inspector({
      inspector: createInspectorUseCase(characterState(), {
        renameSelectedCharacter: (input) => {
          characterCalls.push(input);
          return characterState({ characterName: input.characterName });
        },
        changeSelectedActionTimeRange: (input) => {
          actionCalls.push(input);
          return actionState({ startTime: input.startTime, endTime: input.endTime });
        },
        changeSelectedActionTarget: (input) => {
          targetCalls.push(input);
          return actionState({ targetId: input.targetId });
        },
        changeSelectedActionPayload: (input) => {
          payloadCalls.push(input);
          return actionState({ payload: input.payload });
        },
      }),
    });

    expect(inspector.editCharacterName("character-1", "Zunda Teacher")).toMatchObject({
      type: "character",
      characterName: "Zunda Teacher",
    });
    expect(
      inspector.editActionTimeRange({ sceneId: "scene-1", actionId: "action-1", startTime: 2, endTime: 5 }),
    ).toMatchObject({ type: "action", startTime: 2, endTime: 5 });
    expect(characterCalls).toEqual([{ characterId: "character-1", characterName: "Zunda Teacher" }]);
    expect(inspector.editActionTarget({ sceneId: "scene-1", actionId: "action-1", targetId: "character-2" })).toMatchObject({
      type: "action",
      targetId: "character-2",
    });
    expect(
      inspector.editActionPayload({ sceneId: "scene-1", actionId: "action-1", payload: { text: "Updated" } }),
    ).toMatchObject({ type: "action", payload: { text: "Updated" } });
    expect(actionCalls).toEqual([{ sceneId: "scene-1", actionId: "action-1", startTime: 2, endTime: 5 }]);
    expect(targetCalls).toEqual([{ sceneId: "scene-1", actionId: "action-1", targetId: "character-2" }]);
    expect(payloadCalls).toEqual([{ sceneId: "scene-1", actionId: "action-1", payload: { text: "Updated" } }]);
  });
});

function emptyState(): InspectorState {
  return {
    selection: { type: "none" },
    panel: {
      type: "empty",
      title: "Inspector",
      message: "Select a scene, character, or action to edit it.",
      selectedTargetLabel: "Nothing selected",
    },
  };
}

function sceneState(overrides: Partial<{ sceneName: string; duration: number; backgroundAssetId: string | null }> = {}): InspectorState {
  const sceneName = overrides.sceneName ?? "Opening";
  const duration = overrides.duration ?? 6;
  return {
    selection: { type: "scene", sceneId: "scene-1" },
    panel: {
      type: "scene",
      title: "Scene Inspector",
      selectedTargetLabel: `Scene: ${sceneName}`,
      scene: {
        sceneId: "scene-1",
        sceneName,
        duration,
        backgroundAssetId: overrides.backgroundAssetId ?? null,
        characterIds: [],
        actions: [],
      },
      backgroundCandidates: [
        { assetId: "asset-bg-1", assetName: "Room", assetPath: "assets/backgrounds/room.png", assetType: "background" },
      ],
      editableFields: ["sceneName", "duration", "backgroundAssetId"],
    },
  };
}

function characterState(overrides: Partial<{ characterName: string }> = {}): InspectorState {
  const characterName = overrides.characterName ?? "Zundamon";
  return {
    selection: { type: "character", characterId: "character-1" },
    panel: {
      type: "character",
      title: "Character Inspector",
      selectedTargetLabel: `Character: ${characterName}`,
      character: {
        characterId: "character-1",
        characterName,
        defaultExpression: "neutral",
        defaultEye: "open",
        defaultMouth: "closed",
        defaultMotion: "idle",
      },
      editableFields: ["characterName", "defaultExpression", "defaultEye", "defaultMouth", "defaultMotion"],
    },
  };
}

function actionState(overrides: Partial<{ startTime: number; endTime: number; targetId: string | null; payload: Record<string, unknown> }> = {}): InspectorState {
  return {
    selection: { type: "action", sceneId: "scene-1", actionId: "action-1" },
    panel: {
      type: "action",
      title: "Action Inspector",
      selectedTargetLabel: "Action: talk",
      action: {
        sceneId: "scene-1",
        actionId: "action-1",
        actionType: "talk",
        startTime: overrides.startTime ?? 1,
        endTime: overrides.endTime ?? 3,
        targetId: overrides.targetId ?? "character-1",
        payload: overrides.payload ?? { text: "Hello" },
      },
      editableFields: ["startTime", "endTime", "targetId", "payload"],
    },
  };
}

function createInspectorUseCase(
  state: InspectorState,
  overrides: Partial<
    Pick<
      InspectorUseCase,
      | "clearSelection"
      | "selectScene"
      | "selectCharacter"
      | "selectAction"
      | "renameSelectedScene"
      | "changeSelectedSceneDuration"
      | "changeSelectedSceneBackground"
      | "renameSelectedCharacter"
      | "changeSelectedActionTimeRange"
      | "changeSelectedActionTarget"
      | "changeSelectedActionPayload"
    >
  > = {},
): InspectorUseCase {
  return {
    get state() {
      return state;
    },
    clearSelection: overrides.clearSelection ?? (() => emptyState()),
    selectScene: overrides.selectScene ?? (() => sceneState()),
    selectCharacter: overrides.selectCharacter ?? (() => characterState()),
    selectAction: overrides.selectAction ?? (() => actionState()),
    renameSelectedScene: overrides.renameSelectedScene ?? (() => state),
    changeSelectedSceneDuration: overrides.changeSelectedSceneDuration ?? (() => state),
    changeSelectedSceneBackground: overrides.changeSelectedSceneBackground ?? (() => state),
    renameSelectedCharacter: overrides.renameSelectedCharacter ?? (() => state),
    changeSelectedActionTimeRange: overrides.changeSelectedActionTimeRange ?? (() => state),
    changeSelectedActionTarget: overrides.changeSelectedActionTarget ?? (() => state),
    changeSelectedActionPayload: overrides.changeSelectedActionPayload ?? (() => state),
  };
}
