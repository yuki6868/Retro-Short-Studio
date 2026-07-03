import { describe, expect, it } from "vitest";

import { TimelineUseCase } from "../../app/src";
import { Action, CharacterInstance, CharacterModel, Project, Scene } from "../../core/src";

function createProjectWithScene(): Project {
  const project = Project.create({ projectId: "project-1", projectName: "Timeline Short" });
  project.addCharacterModel(
    CharacterModel.create({
      characterId: "character-model-1",
      characterName: "Zundamon",
      imageMap: { expression: { neutral: "asset-zundamon-neutral" } },
    }),
  );
  project.addScene(
    Scene.create({
      sceneId: "scene-1",
      sceneName: "Opening",
      duration: 10,
      characters: [
        CharacterInstance.create({
          instanceId: "character-instance-1",
          characterId: "character-model-1",
        }).toSnapshot(),
      ],
      actions: [
        Action.create({
          actionId: "action-talk-1",
          actionType: "talk",
          startTime: 1,
          endTime: 3,
          targetId: "character-instance-1",
          payload: { text: "Hello" },
        }).toSnapshot(),
        Action.create({
          actionId: "action-move-1",
          actionType: "move",
          startTime: 4,
          endTime: 6,
          targetId: "character-instance-1",
          payload: { x: 120 },
        }).toSnapshot(),
        Action.create({
          actionId: "action-fade-1",
          actionType: "fade",
          startTime: 0,
          endTime: 1,
          targetId: null,
          payload: { alpha: 0.8 },
        }).toSnapshot(),
        Action.create({
          actionId: "action-camera-1",
          actionType: "camera_zoom",
          startTime: 6,
          endTime: 8,
          targetId: "camera-main",
          payload: { zoom: 1.2 },
        }).toSnapshot(),
      ],
    }),
  );

  return project;
}

describe("TimelineUseCase", () => {
  it("starts without selecting a scene and does not expose project internals", () => {
    const useCase = new TimelineUseCase({ project: createProjectWithScene() });

    const state = useCase.state;

    expect(state.sceneId).toBeNull();
    expect(state.tracks.map((track) => track.trackId)).toEqual(["character:unassigned", "effect", "camera"]);
    expect(state.tracks.map((track) => track.purpose)).toEqual([
      "Character actions that do not have a CharacterInstance target yet.",
      "Scene effects such as fade, flash, emphasis, and screen effects.",
      "Camera actions such as zoom, pan, and camera movement.",
    ]);
    expect(Object.keys(state)).not.toContain("project");
    expect(Object.keys(state)).not.toContain("actions");
  });

  it("projects scene actions into timeline tracks without becoming the data source", () => {
    const useCase = new TimelineUseCase({ project: createProjectWithScene(), initialTimeScale: 100 });

    const state = useCase.showScene("scene-1");

    expect(state.sceneName).toBe("Opening");
    const characterTrack = state.tracks.find((track) => track.trackId === "character:character-instance-1");
    expect(characterTrack?.label).toBe("Zundamon");
    expect(characterTrack?.characterInstanceId).toBe("character-instance-1");
    expect(characterTrack?.items.find((item) => item.actionId === "action-talk-1")).toMatchObject({
      actionId: "action-talk-1",
      actionType: "talk",
      startTime: 1,
      endTime: 3,
      duration: 2,
      left: 100,
      width: 200,
    });
    expect(characterTrack?.items.find((item) => item.actionId === "action-move-1")).toMatchObject({
      actionId: "action-move-1",
      actionType: "move",
      left: 400,
      width: 200,
    });
    expect(state.tracks.find((track) => track.trackId === "effect")?.items).toMatchObject([
      {
        actionId: "action-fade-1",
        actionType: "fade",
        left: 0,
        width: 100,
      },
    ]);
    expect(state.tracks.find((track) => track.trackId === "camera")?.items).toMatchObject([
      {
        actionId: "action-camera-1",
        actionType: "camera_zoom",
        left: 600,
        width: 200,
      },
    ]);
  });

  it("keeps dedicated track definitions even when actions are empty", () => {
    const useCase = new TimelineUseCase({ project: createProjectWithScene() });

    const state = useCase.showScene("scene-1");

    expect(state.tracks.find((track) => track.trackId === "character:character-instance-1")?.acceptedActionTypes).toContain("talk");
    expect(state.tracks.find((track) => track.trackId === "character:character-instance-1")?.acceptedActionTypes).toContain("move");
    expect(state.tracks.find((track) => track.trackId === "effect")?.acceptedActionTypes).toContain("flash");
    expect(state.tracks.find((track) => track.trackId === "camera")?.acceptedActionTypes).toContain("camera_zoom");
  });

  it("keeps playhead as view state and clamps it to the selected scene duration", () => {
    const useCase = new TimelineUseCase({ project: createProjectWithScene() });

    useCase.showScene("scene-1");

    expect(useCase.setPlayhead({ time: 4.5 }).playhead).toBe(4.5);
    expect(useCase.setPlayhead({ time: -1 }).playhead).toBe(0);
    expect(useCase.setPlayhead({ time: 99 }).playhead).toBe(10);
  });

  it("changes timeScale without modifying the Project action data", () => {
    const project = createProjectWithScene();
    const useCase = new TimelineUseCase({ project, initialTimeScale: 50 });

    useCase.showScene("scene-1");
    const state = useCase.setTimeScale({ timeScale: 120 });

    expect(state.timeScale).toBe(120);
    expect(state.tracks.find((track) => track.trackId === "character:character-instance-1")?.items[0].left).toBe(120);
    expect(project.toSnapshot().scenes[0]?.actions[0]?.startTime).toBe(1);
  });

  it("rejects invalid view-only timeline inputs", () => {
    const useCase = new TimelineUseCase({ project: createProjectWithScene() });

    expect(() => useCase.showScene("missing-scene")).toThrow("Timeline scene does not exist: missing-scene.");
    expect(() => useCase.showScene(" ")).toThrow("Timeline sceneId is required.");
    expect(() => useCase.setPlayhead({ time: Number.NaN })).toThrow("Timeline playhead must be a finite number.");
    expect(() => useCase.setTimeScale({ timeScale: 0 })).toThrow("Timeline timeScale must be a positive number.");
  });
});

describe("TimelineUseCase drag and resize", () => {
  it("moves an action by converting a timeline operation into an Action time range update", () => {
    const project = createProjectWithScene();
    const useCase = new TimelineUseCase({ project, initialTimeScale: 100 });

    const state = useCase.moveItem({ sceneId: "scene-1", actionId: "action-talk-1", nextStartTime: 2.5 });

    expect(state.tracks.find((track) => track.trackId === "character:character-instance-1")?.items[0]).toMatchObject({
      actionId: "action-talk-1",
      startTime: 2.5,
      endTime: 4.5,
      left: 250,
      width: 200,
    });
    expect(project.toSnapshot().scenes[0]?.actions.find((action) => action.actionId === "action-talk-1")).toMatchObject({
      startTime: 2.5,
      endTime: 4.5,
    });
  });

  it("resizes only the action start time through the timeline use case", () => {
    const project = createProjectWithScene();
    const useCase = new TimelineUseCase({ project, initialTimeScale: 100 });

    const state = useCase.resizeItemStart({ sceneId: "scene-1", actionId: "action-move-1", nextStartTime: 3.25 });

    expect(state.tracks.find((track) => track.trackId === "character:character-instance-1")?.items.find((item) => item.actionId === "action-move-1")).toMatchObject({
      actionId: "action-move-1",
      startTime: 3.25,
      endTime: 6,
      duration: 2.75,
      left: 325,
      width: 275,
    });
  });

  it("resizes only the action end time through the timeline use case", () => {
    const project = createProjectWithScene();
    const useCase = new TimelineUseCase({ project, initialTimeScale: 100 });

    const state = useCase.resizeItemEnd({ sceneId: "scene-1", actionId: "action-camera-1", nextEndTime: 9.5 });

    expect(state.tracks.find((track) => track.trackId === "camera")?.items[0]).toMatchObject({
      actionId: "action-camera-1",
      startTime: 6,
      endTime: 9.5,
      duration: 3.5,
      left: 600,
      width: 350,
    });
  });

  it("rejects timeline edits that would make invalid action ranges", () => {
    expect(() =>
      new TimelineUseCase({ project: createProjectWithScene(), minActionDuration: 0.25 }).moveItem({
        sceneId: "scene-1",
        actionId: "action-talk-1",
        nextStartTime: -0.1,
      }),
    ).toThrow("Timeline action cannot start before 0s: action-talk-1.");
    expect(() =>
      new TimelineUseCase({ project: createProjectWithScene(), minActionDuration: 0.25 }).moveItem({
        sceneId: "scene-1",
        actionId: "action-talk-1",
        nextStartTime: 9,
      }),
    ).toThrow("Timeline action cannot end after the scene duration: action-talk-1.");
    expect(() =>
      new TimelineUseCase({ project: createProjectWithScene(), minActionDuration: 0.25 }).resizeItemStart({
        sceneId: "scene-1",
        actionId: "action-talk-1",
        nextStartTime: 2.9,
      }),
    ).toThrow("Timeline action duration is too short: action-talk-1.");
    expect(() =>
      new TimelineUseCase({ project: createProjectWithScene(), minActionDuration: 0.25 }).resizeItemEnd({
        sceneId: "scene-1",
        actionId: "action-talk-1",
        nextEndTime: 1.1,
      }),
    ).toThrow("Timeline action duration is too short: action-talk-1.");
  });
});
