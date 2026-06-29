import { describe, expect, it } from "vitest";

import { InspectorUseCase, SelectionState } from "../../app/src";
import { Action, CharacterModel, Project, Scene } from "../../core/src";

function createProject(): Project {
  const project = Project.create({ projectId: "project-1", projectName: "Inspector Test" });
  const scene = Scene.create({ sceneId: "scene-1", sceneName: "Opening", duration: 6 });
  scene.addAction(
    Action.create({
      actionId: "action-1",
      actionType: "talk",
      startTime: 1,
      endTime: 3,
      targetId: "character-1",
      payload: { text: "Hello" },
    }),
  );
  project.addScene(scene);
  project.addCharacterModel(CharacterModel.create({ characterId: "character-1", characterName: "Zundamon" }));
  return project;
}

describe("SelectionState", () => {
  it("keeps selection target explicit instead of using nullable magic strings", () => {
    expect(SelectionState.empty().toTarget()).toEqual({ type: "none" });
    expect(SelectionState.scene(" scene-1 ").toTarget()).toEqual({ type: "scene", sceneId: "scene-1" });
    expect(SelectionState.character("character-1").toTarget()).toEqual({
      type: "character",
      characterId: "character-1",
    });
    expect(SelectionState.action("scene-1", "action-1").toTarget()).toEqual({
      type: "action",
      sceneId: "scene-1",
      actionId: "action-1",
    });
  });
});

describe("InspectorUseCase", () => {
  it("starts empty and does not expose Project, Engine, or UI form internals", () => {
    const useCase = new InspectorUseCase({ project: createProject() });

    const state = useCase.state;

    expect(state.selection).toEqual({ type: "none" });
    expect(state.panel).toMatchObject({ type: "empty", selectedTargetLabel: "Nothing selected" });
    expect(Object.keys(state)).not.toContain("project");
    expect(Object.keys(state)).not.toContain("engineClient");
    expect(Object.keys(state)).not.toContain("formState");
  });

  it("switches to SceneInspector when a scene is selected", () => {
    const useCase = new InspectorUseCase({ project: createProject() });

    const state = useCase.selectScene("scene-1");

    expect(state.panel).toMatchObject({
      type: "scene",
      title: "Scene Inspector",
      selectedTargetLabel: "Scene: Opening",
      editableFields: ["sceneName", "duration", "backgroundAssetId"],
    });
    expect(state.panel.type === "scene" ? state.panel.scene.sceneName : null).toBe("Opening");
  });

  it("edits the selected scene through the Project aggregate", () => {
    const project = createProject();
    const useCase = new InspectorUseCase({ project });

    useCase.selectScene("scene-1");
    const renamed = useCase.renameSelectedScene({ sceneId: "scene-1", sceneName: "Hook" });
    const durationChanged = useCase.changeSelectedSceneDuration({ sceneId: "scene-1", duration: 9 });

    expect(renamed.panel.selectedTargetLabel).toBe("Scene: Hook");
    expect(durationChanged.panel.type === "scene" ? durationChanged.panel.scene.duration : null).toBe(9);
    expect(project.toSnapshot().scenes[0]).toMatchObject({ sceneName: "Hook", duration: 9 });
  });

  it("switches to CharacterInspector and edits the character through the Project aggregate", () => {
    const project = createProject();
    const useCase = new InspectorUseCase({ project });

    const selected = useCase.selectCharacter("character-1");
    const renamed = useCase.renameSelectedCharacter({ characterId: "character-1", characterName: "Zunda Teacher" });

    expect(selected.panel).toMatchObject({
      type: "character",
      title: "Character Inspector",
      selectedTargetLabel: "Character: Zundamon",
    });
    expect(renamed.panel.selectedTargetLabel).toBe("Character: Zunda Teacher");
    expect(project.toSnapshot().characters[0].characterName).toBe("Zunda Teacher");
  });

  it("switches to ActionInspector and edits action timing without letting UI parse actions", () => {
    const project = createProject();
    const useCase = new InspectorUseCase({ project });

    const selected = useCase.selectAction("scene-1", "action-1");
    const changed = useCase.changeSelectedActionTimeRange({
      sceneId: "scene-1",
      actionId: "action-1",
      startTime: 2,
      endTime: 5,
    });

    expect(selected.panel).toMatchObject({
      type: "action",
      title: "Action Inspector",
      selectedTargetLabel: "Action: talk",
      editableFields: ["startTime", "endTime", "targetId", "payload"],
    });
    expect(changed.panel.type === "action" ? changed.panel.action.startTime : null).toBe(2);
    expect(project.toSnapshot().scenes[0].actions[0]).toMatchObject({ startTime: 2, endTime: 5 });
  });

  it("rejects selection outside the project instead of creating phantom inspector panels", () => {
    const useCase = new InspectorUseCase({ project: createProject() });

    expect(() => useCase.selectScene("missing-scene")).toThrow("Scene does not exist: missing-scene.");
    expect(() => useCase.selectCharacter("missing-character")).toThrow("Character does not exist: missing-character.");
    expect(() => useCase.selectAction("scene-1", "missing-action")).toThrow(
      "Action does not exist in scene scene-1: missing-action.",
    );
  });
});
