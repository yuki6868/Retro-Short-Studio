import { describe, expect, it } from "vitest";

import { AssetLibraryUseCase } from "../../app/src";
import { DeterministicIdGenerator, Project, Scene } from "../../core/src";

function createUseCase(): { useCase: AssetLibraryUseCase; project: Project } {
  const project = Project.create({ projectId: "project-1", projectName: "Opening Short" });
  const useCase = new AssetLibraryUseCase({
    project,
    idGenerator: new DeterministicIdGenerator(),
  });

  return { project, useCase };
}

describe("AssetLibraryUseCase", () => {
  it("starts with an empty asset list without exposing project internals", () => {
    const { useCase } = createUseCase();

    const state = useCase.state;

    expect(state.assets).toEqual([]);
    expect(state.selectedAssetId).toBeNull();
    expect(Object.keys(state)).not.toContain("project");
    expect(Object.keys(state)).not.toContain("collections");
  });

  it("adds an asset through the Project aggregate and selects the new asset", () => {
    const { project, useCase } = createUseCase();

    const state = useCase.addAsset({
      assetName: "Room Background",
      assetPath: "assets/backgrounds/room.png",
      assetType: "background",
    });

    expect(state.assets).toEqual([
      {
        assetId: "asset-1",
        assetName: "Room Background",
        assetPath: "assets/backgrounds/room.png",
        assetType: "background",
      },
    ]);
    expect(state.selectedAssetId).toBe("asset-1");
    expect(project.toSnapshot().assets).toHaveLength(1);
  });

  it("lists assets in project order after multiple additions", () => {
    const { useCase } = createUseCase();

    useCase.addAsset({ assetName: "Room", assetPath: "assets/backgrounds/room.png", assetType: "background" });
    useCase.addAsset({ assetName: "Zundamon Open", assetPath: "assets/characters/zundamon_open.png", assetType: "character_image" });

    expect(useCase.listAssets().map((asset) => asset.assetName)).toEqual(["Room", "Zundamon Open"]);
    expect(useCase.state.selectedAssetId).toBe("asset-2");
  });

  it("selects an existing asset without changing the asset list", () => {
    const { useCase } = createUseCase();

    useCase.addAsset({ assetName: "Room", assetPath: "assets/backgrounds/room.png", assetType: "background" });
    useCase.addAsset({ assetName: "Voice", assetPath: "voices/line001.wav", assetType: "voice" });

    const state = useCase.selectAsset("asset-1");

    expect(state.selectedAssetId).toBe("asset-1");
    expect(state.assets.map((asset) => asset.assetId)).toEqual(["asset-1", "asset-2"]);
  });

  it("rejects selecting an asset that does not exist in the project", () => {
    const { useCase } = createUseCase();

    expect(() => useCase.selectAsset("missing-asset")).toThrow("Asset does not exist: missing-asset.");
  });

  it("deletes an asset and clears the selected asset", () => {
    const { project, useCase } = createUseCase();
    useCase.addAsset({ assetName: "Room", assetPath: "assets/room.png", assetType: "background" });
    useCase.addAsset({ assetName: "Voice", assetPath: "voices/line.wav", assetType: "voice" });

    const state = useCase.deleteAsset({ assetId: "asset-2" });

    expect(state.assets.map((asset) => asset.assetId)).toEqual(["asset-1"]);
    expect(state.selectedAssetId).toBeNull();
    expect(project.toSnapshot().assets.map((asset) => asset.assetId)).toEqual(["asset-1"]);
  });

  it("clears scene background references when deleting a background asset", () => {
    const { project, useCase } = createUseCase();
    project.addScene(Scene.create({ sceneId: "scene-1", sceneName: "Opening", duration: 6, backgroundAssetId: "asset-1" }));
    useCase.addAsset({ assetName: "Room", assetPath: "assets/room.png", assetType: "background" });

    useCase.deleteAsset({ assetId: "asset-1" });

    expect(project.toSnapshot().scenes[0]?.backgroundAssetId).toBeNull();
  });

  it("updates asset metadata and keeps the asset selected", () => {
    const { project, useCase } = createUseCase();
    useCase.addAsset({ assetName: "Asset 1", assetPath: "assets/asset-1.png", assetType: "background" });

    const state = useCase.updateAsset({
      assetId: "asset-1",
      assetName: "Room Background",
      assetPath: "assets/backgrounds/room.png",
      assetType: "background",
    });

    expect(state.selectedAssetId).toBe("asset-1");
    expect(state.assets[0]).toEqual({
      assetId: "asset-1",
      assetName: "Room Background",
      assetPath: "assets/backgrounds/room.png",
      assetType: "background",
    });
    expect(project.toSnapshot().assets[0]).toMatchObject({
      assetName: "Room Background",
      assetPath: "assets/backgrounds/room.png",
    });
  });
});
