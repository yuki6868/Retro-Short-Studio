import { describe, expect, it } from "vitest";

import { Background, Duration, Scene, SceneId, SceneName } from "../../core/src";

describe("Scene Core", () => {
  it("creates a scene snapshot with background, characters, and actions", () => {
    const scene = Scene.create({
      sceneId: " s-1 ",
      sceneName: " オープニング ",
      duration: 5,
      backgroundAssetId: " bg-1 ",
      characters: [{ instanceId: " ci-1 ", characterId: " c-1 ", transform: { x: 0, y: 0, scale: 1, rotation: 0 }, expression: "neutral", eye: "open", mouth: "closed", motion: "idle" }],
      actions: [{ actionId: " a-1 " }],
    });

    expect(scene.toSnapshot()).toEqual({
      sceneId: "s-1",
      sceneName: "オープニング",
      duration: 5,
      backgroundAssetId: "bg-1",
      characters: [{ instanceId: "ci-1", characterId: "c-1", transform: { x: 0, y: 0, scale: 1, rotation: 0 }, expression: "neutral", eye: "open", mouth: "closed", motion: "idle" }],
      actions: [{ actionId: "a-1" }],
    });
  });

  it("can be created without a background, characters, or actions", () => {
    const scene = Scene.create({ sceneId: "s-1", sceneName: "空シーン", duration: 3 });

    expect(scene.toSnapshot()).toEqual({
      sceneId: "s-1",
      sceneName: "空シーン",
      duration: 3,
      backgroundAssetId: null,
      characters: [],
      actions: [],
    });
  });

  it("rejects invalid scene values", () => {
    expect(() => SceneId.create("   ")).toThrow("SceneId is required.");
    expect(() => SceneName.create("   ")).toThrow("SceneName is required.");
    expect(() => Duration.create(0)).toThrow("Duration must be a positive finite number.");
    expect(() => Duration.create(Number.POSITIVE_INFINITY)).toThrow("Duration must be a positive finite number.");
    expect(() => Background.create("   ")).toThrow("Background asset id must be a non-empty string or null.");
    expect(() => Scene.create({ sceneId: "s-1", sceneName: "Scene", duration: 1, characters: [{ instanceId: " ", characterId: "c-1", transform: { x: 0, y: 0, scale: 1, rotation: 0 }, expression: "neutral", eye: "open", mouth: "closed", motion: "idle" }] })).toThrow("CharacterInstanceId is required.");
    expect(() => Scene.create({ sceneId: "s-1", sceneName: "Scene", duration: 1, actions: [{ actionId: " " }] })).toThrow("Scene action id is required.");
  });

  it("renames, changes duration, and changes background through value object rules", () => {
    const scene = Scene.create({ sceneId: "s-1", sceneName: "Old", duration: 3 });

    scene.rename(" New ");
    scene.changeDuration(8);
    scene.changeBackground(" bg-2 ");

    expect(scene.toSnapshot()).toMatchObject({
      sceneId: "s-1",
      sceneName: "New",
      duration: 8,
      backgroundAssetId: "bg-2",
    });
    expect(() => scene.rename("   ")).toThrow("SceneName is required.");
    expect(() => scene.changeDuration(-1)).toThrow("Duration must be a positive finite number.");
  });

  it("restores from snapshots without retaining external references", () => {
    const snapshot = {
      sceneId: "s-1",
      sceneName: "Restored",
      duration: 4,
      backgroundAssetId: "bg-1",
      characters: [{ instanceId: "ci-1", characterId: "c-1", transform: { x: 0, y: 0, scale: 1, rotation: 0 }, expression: "neutral", eye: "open", mouth: "closed", motion: "idle" }],
      actions: [{ actionId: "a-1" }],
    };

    const scene = Scene.restore(snapshot);
    snapshot.characters[0].characterId = "mutated";
    const output = scene.toSnapshot();
    output.actions[0].actionId = "mutated";

    expect(scene.toSnapshot()).toEqual({
      sceneId: "s-1",
      sceneName: "Restored",
      duration: 4,
      backgroundAssetId: "bg-1",
      characters: [{ instanceId: "ci-1", characterId: "c-1", transform: { x: 0, y: 0, scale: 1, rotation: 0 }, expression: "neutral", eye: "open", mouth: "closed", motion: "idle" }],
      actions: [{ actionId: "a-1" }],
    });
  });
});
