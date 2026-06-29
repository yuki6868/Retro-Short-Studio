import { describe, expect, it } from "vitest";

import type { AddSceneInput, MoveSceneInput, SceneFlowState } from "../../app/src";
import { SceneFlow, type SceneFlowUseCase } from "../../frontend/src";

describe("SceneFlow", () => {
  it("renders an empty scene flow with add affordance", () => {
    const flow = new SceneFlow({ scenes: createSceneUseCase(emptyState()) });

    const view = flow.render();

    expect(view.title).toBe("Scene Flow");
    expect(view.scenes).toEqual([]);
    expect(view.emptyText).toBe("Add scenes to build the short video flow.");
    expect(view.addButton).toEqual({ label: "Add Scene", disabled: false });
    expect(view.canReorder).toBe(false);
  });

  it("delegates scene addition to the scene flow use case", () => {
    const calls: AddSceneInput[] = [];
    const flow = new SceneFlow({
      scenes: createSceneUseCase(emptyState(), {
        addScene: (input) => {
          calls.push(input);
          return {
            scenes: [
              {
                sceneId: "scene-1",
                sceneName: input.sceneName,
                duration: input.duration,
                backgroundAssetId: input.backgroundAssetId ?? null,
                characterIds: [],
                actions: [],
              },
            ],
            selectedSceneId: "scene-1",
          };
        },
      }),
    });

    const view = flow.clickAdd({ sceneName: "Opening", duration: 6 });

    expect(calls).toEqual([{ sceneName: "Opening", duration: 6 }]);
    expect(view.sceneCount).toBe(1);
    expect(view.selectedSceneId).toBe("scene-1");
    expect(view.scenes[0]).toMatchObject({ sceneName: "Opening", selected: true, orderLabel: "01" });
  });

  it("delegates selection, deletion, and reorder instead of owning scene data", () => {
    const selectedIds: string[] = [];
    const deletedIds: string[] = [];
    const moveCalls: MoveSceneInput[] = [];
    const state = populatedState();
    const flow = new SceneFlow({
      scenes: createSceneUseCase(state, {
        selectScene: (sceneId) => {
          selectedIds.push(sceneId);
          return { ...state, selectedSceneId: sceneId };
        },
        deleteScene: (sceneId) => {
          deletedIds.push(sceneId);
          return {
            scenes: state.scenes.filter((scene) => scene.sceneId !== sceneId),
            selectedSceneId: "scene-1",
          };
        },
        moveScene: (input) => {
          moveCalls.push(input);
          return {
            scenes: [state.scenes[1], state.scenes[0]],
            selectedSceneId: input.sceneId,
          };
        },
      }),
    });

    expect(flow.clickSelect("scene-2").selectedSceneId).toBe("scene-2");
    expect(flow.clickDelete("scene-2").scenes.map((scene) => scene.sceneId)).toEqual(["scene-1"]);
    expect(flow.move("scene-2", 0).scenes.map((scene) => scene.sceneName)).toEqual(["Explanation", "Opening"]);

    expect(selectedIds).toEqual(["scene-2"]);
    expect(deletedIds).toEqual(["scene-2"]);
    expect(moveCalls).toEqual([{ sceneId: "scene-2", toIndex: 0 }]);
  });

  it("does not expose Project, Timeline, or Engine details to the flow view", () => {
    const flow = new SceneFlow({ scenes: createSceneUseCase(populatedState()) });

    const view = flow.render();

    expect(Object.keys(view)).not.toContain("project");
    expect(Object.keys(view)).not.toContain("timeline");
    expect(Object.keys(view)).not.toContain("engineClient");
    expect(view.scenes[0]).not.toHaveProperty("projectScene");
  });
});

function emptyState(): SceneFlowState {
  return {
    scenes: [],
    selectedSceneId: null,
  };
}

function populatedState(): SceneFlowState {
  return {
    scenes: [
      {
        sceneId: "scene-1",
        sceneName: "Opening",
        duration: 4,
        backgroundAssetId: null,
        characterIds: [],
        actions: [],
      },
      {
        sceneId: "scene-2",
        sceneName: "Explanation",
        duration: 8,
        backgroundAssetId: null,
        characterIds: [],
        actions: [],
      },
    ],
    selectedSceneId: "scene-1",
  };
}

function createSceneUseCase(
  state: SceneFlowState,
  overrides: Partial<Pick<SceneFlowUseCase, "addScene" | "deleteScene" | "moveScene" | "selectScene">> = {},
): SceneFlowUseCase {
  return {
    get state() {
      return state;
    },
    addScene: overrides.addScene ?? (() => state),
    deleteScene: overrides.deleteScene ?? (() => state),
    moveScene: overrides.moveScene ?? (() => state),
    selectScene: overrides.selectScene ?? (() => state),
  };
}
