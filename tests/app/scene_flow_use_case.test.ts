import { describe, expect, it } from "vitest";

import { SceneFlowUseCase } from "../../app/src";
import { DeterministicIdGenerator, Project, Scene } from "../../core/src";

function createUseCase(): { useCase: SceneFlowUseCase; project: Project } {
  const project = Project.create({ projectId: "project-1", projectName: "Opening Short" });
  const useCase = new SceneFlowUseCase({
    project,
    idGenerator: new DeterministicIdGenerator(),
  });

  return { project, useCase };
}

describe("SceneFlowUseCase", () => {
  it("starts with an empty scene flow without exposing project internals", () => {
    const { useCase } = createUseCase();

    const state = useCase.state;

    expect(state.scenes).toEqual([]);
    expect(state.selectedSceneId).toBeNull();
    expect(Object.keys(state)).not.toContain("project");
    expect(Object.keys(state)).not.toContain("timeline");
    expect(Object.keys(state)).not.toContain("engineClient");
  });

  it("adds a scene through the Project aggregate and selects the new scene", () => {
    const { project, useCase } = createUseCase();

    const state = useCase.addScene({
      sceneName: "Opening",
      duration: 6,
      backgroundAssetId: "asset-background-1",
    });

    expect(state.scenes).toEqual([
      {
        sceneId: "scene-1",
        sceneName: "Opening",
        duration: 6,
        backgroundAssetId: "asset-background-1",
        characterIds: [],
        actions: [],
      },
    ]);
    expect(state.selectedSceneId).toBe("scene-1");
    expect(project.toSnapshot().scenes).toHaveLength(1);
  });

  it("lists scenes in project order after multiple additions", () => {
    const { useCase } = createUseCase();

    useCase.addScene({ sceneName: "Opening", duration: 4 });
    useCase.addScene({ sceneName: "Explanation", duration: 8 });
    useCase.addScene({ sceneName: "Ending", duration: 5 });

    expect(useCase.listScenes().map((scene) => scene.sceneName)).toEqual(["Opening", "Explanation", "Ending"]);
    expect(useCase.state.selectedSceneId).toBe("scene-3");
  });

  it("selects an existing scene without changing the scene list", () => {
    const { useCase } = createUseCase();

    useCase.addScene({ sceneName: "Opening", duration: 4 });
    useCase.addScene({ sceneName: "Explanation", duration: 8 });

    const state = useCase.selectScene("scene-1");

    expect(state.selectedSceneId).toBe("scene-1");
    expect(state.scenes.map((scene) => scene.sceneId)).toEqual(["scene-1", "scene-2"]);
  });

  it("deletes a scene through Project and keeps the next flow selectable", () => {
    const { project, useCase } = createUseCase();

    useCase.addScene({ sceneName: "Opening", duration: 4 });
    useCase.addScene({ sceneName: "Explanation", duration: 8 });
    useCase.selectScene("scene-1");

    const state = useCase.deleteScene("scene-1");

    expect(state.scenes.map((scene) => scene.sceneId)).toEqual(["scene-2"]);
    expect(state.selectedSceneId).toBe("scene-2");
    expect(project.toSnapshot().scenes.map((scene) => scene.sceneId)).toEqual(["scene-2"]);
  });

  it("reorders scenes without treating the whole movie as a free timeline", () => {
    const { useCase } = createUseCase();

    useCase.addScene({ sceneName: "Opening", duration: 4 });
    useCase.addScene({ sceneName: "Explanation", duration: 8 });
    useCase.addScene({ sceneName: "Ending", duration: 5 });

    const state = useCase.moveScene({ sceneId: "scene-3", toIndex: 0 });

    expect(state.scenes.map((scene) => scene.sceneName)).toEqual(["Ending", "Opening", "Explanation"]);
    expect(state.selectedSceneId).toBe("scene-3");
  });

  it("rejects operations for scenes outside the project flow", () => {
    const { useCase } = createUseCase();

    useCase.addScene({ sceneName: "Opening", duration: 4 });

    expect(() => useCase.selectScene("missing-scene")).toThrow("Scene does not exist: missing-scene.");
    expect(() => useCase.deleteScene("missing-scene")).toThrow("Scene does not exist: missing-scene.");
    expect(() => useCase.moveScene({ sceneId: "scene-1", toIndex: 3 })).toThrow(
      "Scene move target index is out of range: 3.",
    );
  });

  it("preserves restored project scenes when the use case starts", () => {
    const project = Project.create({ projectId: "project-1", projectName: "Opening Short" });
    project.addScene(Scene.create({ sceneId: "scene-existing", sceneName: "Existing", duration: 10 }));

    const useCase = new SceneFlowUseCase({ project, idGenerator: new DeterministicIdGenerator() });

    expect(useCase.state.scenes.map((scene) => scene.sceneName)).toEqual(["Existing"]);
  });
});
