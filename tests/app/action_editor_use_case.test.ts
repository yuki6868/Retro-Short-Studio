import { describe, expect, it } from "vitest";

import { ActionEditorUseCase } from "../../app/src";
import { Project, Scene, type IdGenerator } from "../../core/src";

class SequentialIdGenerator implements IdGenerator {
  private next = 1;

  generate(prefix: string): string {
    return `${prefix}-${this.next++}`;
  }
}

function createProject(): Project {
  const project = Project.create({ projectId: "project-1", projectName: "Action Creation Short" });
  project.addScene(Scene.create({ sceneId: "scene-1", sceneName: "Opening", duration: 8 }));
  return project;
}

describe("ActionEditorUseCase", () => {
  it("creates a talk action at the current timeline time through a use case", () => {
    const project = createProject();
    const useCase = new ActionEditorUseCase({ project, idGenerator: new SequentialIdGenerator() });

    const result = useCase.createAction({ sceneId: "scene-1", kind: "talk", startTime: 2 });

    expect(result.action).toMatchObject({
      actionId: "action-1",
      actionType: "talk",
      startTime: 2,
      endTime: 5,
      targetId: "character-main",
      payload: {
        text: "",
        speakerId: "3",
        speakerCharacterId: "character-main",
        voiceAssetId: null,
        generatedVoicePath: null,
        generatedVoiceDuration: null,
        lipSyncEnabled: true,
      },
    });
    expect(project.toSnapshot().scenes[0]?.actions).toHaveLength(1);
  });

  it("creates dedicated action types for character, effect, and camera tracks", () => {
    const project = createProject();
    const useCase = new ActionEditorUseCase({ project, idGenerator: new SequentialIdGenerator() });

    useCase.createAction({ sceneId: "scene-1", kind: "character", startTime: 0.5 });
    useCase.createAction({ sceneId: "scene-1", kind: "effect", startTime: 2 });
    useCase.createAction({ sceneId: "scene-1", kind: "camera", startTime: 4 });

    expect(project.toSnapshot().scenes[0]?.actions.map((action) => action.actionType)).toEqual([
      "move",
      "flash",
      "camera_zoom",
    ]);
  });

  it("uses supplied target, payload, and duration without putting defaults in the UI", () => {
    const project = createProject();
    const useCase = new ActionEditorUseCase({ project, idGenerator: new SequentialIdGenerator() });

    const result = useCase.createAction({
      sceneId: "scene-1",
      kind: "talk",
      startTime: 1,
      duration: 1.25,
      targetId: "character-zundamon",
      payload: { text: "Hello" },
    });

    expect(result.action).toMatchObject({
      startTime: 1,
      endTime: 2.25,
      targetId: "character-zundamon",
      payload: { text: "Hello" },
    });
  });

  it("deletes an action from the selected scene through a use case", () => {
    const project = createProject();
    const useCase = new ActionEditorUseCase({ project, idGenerator: new SequentialIdGenerator() });
    const created = useCase.createAction({ sceneId: "scene-1", kind: "talk", startTime: 0 });

    const result = useCase.deleteAction({ sceneId: "scene-1", actionId: created.action.actionId });

    expect(result).toEqual({ sceneId: "scene-1", actionId: "action-1" });
    expect(project.toSnapshot().scenes[0]?.actions).toEqual([]);
  });

  it("moves default-created actions left when the playhead is too close to the scene end", () => {
    const project = createProject();
    const useCase = new ActionEditorUseCase({ project, idGenerator: new SequentialIdGenerator() });

    const result = useCase.createAction({ sceneId: "scene-1", kind: "talk", startTime: 8 });

    expect(result.action).toMatchObject({
      startTime: 5,
      endTime: 8,
    });
    expect(project.toSnapshot().scenes[0]?.actions).toHaveLength(1);
  });

  it("keeps explicit action durations strict before mutating the project", () => {
    const project = createProject();
    const useCase = new ActionEditorUseCase({ project, idGenerator: new SequentialIdGenerator() });

    expect(() => useCase.createAction({ sceneId: "scene-1", kind: "talk", startTime: 6, duration: 3 })).toThrow(
      "Action cannot end after the scene duration: scene-1.",
    );
    expect(() => useCase.createAction({ sceneId: "scene-1", kind: "talk", startTime: -1 })).toThrow(
      "Action startTime must be a non-negative finite number.",
    );
    expect(project.toSnapshot().scenes[0]?.actions).toEqual([]);
  });
});
