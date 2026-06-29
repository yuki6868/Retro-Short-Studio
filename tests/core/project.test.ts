import { describe, expect, it } from "vitest";

import { Asset, Project, ProjectCollections } from "../../core/src";

describe("Project", () => {
  it("creates a project with default settings and empty collections", () => {
    const project = Project.create({ projectId: "p-1", projectName: "Sample" });

    expect(project.toSnapshot()).toEqual({
      projectId: "p-1",
      projectName: "Sample",
      settings: { width: 1080, height: 1920, fps: 30 },
      scenes: [],
      assets: [],
      characters: [],
    });
  });

  it("creates a project with custom settings", () => {
    const project = Project.create({
      projectId: "p-1",
      projectName: "Sample",
      settings: { width: 720, height: 1280, fps: 60 },
    });

    expect(project.toSnapshot().settings).toEqual({ width: 720, height: 1280, fps: 60 });
  });

  it("restores a project from a snapshot", () => {
    const project = Project.restore({
      projectId: "p-1",
      projectName: "Restored",
      settings: { width: 800, height: 600, fps: 24 },
      scenes: [{ sceneId: "s-1" }],
      assets: [{ assetId: "a-1", assetName: "背景", assetType: "background", assetPath: "assets/bg.png" }],
      characters: [{ characterId: "c-1" }],
    });

    expect(project.toSnapshot()).toEqual({
      projectId: "p-1",
      projectName: "Restored",
      settings: { width: 800, height: 600, fps: 24 },
      scenes: [{ sceneId: "s-1" }],
      assets: [{ assetId: "a-1", assetName: "背景", assetType: "background", assetPath: "assets/bg.png" }],
      characters: [{ characterId: "c-1" }],
    });
  });

  it("does not retain external snapshot array or object references", () => {
    const snapshot = {
      projectId: "p-1",
      projectName: "Restored",
      settings: { width: 800, height: 600, fps: 24 },
      scenes: [{ sceneId: "s-1" }],
      assets: [{ assetId: "a-1", assetName: "背景", assetType: "background", assetPath: "assets/bg.png" }],
      characters: [{ characterId: "c-1" }],
    };

    const project = Project.restore(snapshot);

    snapshot.scenes[0].sceneId = "mutated";
    snapshot.assets.push({ assetId: "a-2", assetName: "音声", assetType: "voice", assetPath: "voices/talk.wav" });

    expect(project.toSnapshot().scenes).toEqual([{ sceneId: "s-1" }]);
    expect(project.toSnapshot().assets).toEqual([{ assetId: "a-1", assetName: "背景", assetType: "background", assetPath: "assets/bg.png" }]);
  });

  it("adds assets through Project without exposing collection mutation", () => {
    const project = Project.create({ projectId: "p-1", projectName: "Sample" });
    const asset = Asset.create({
      assetId: "a-1",
      assetName: "背景",
      assetType: "background",
      assetPath: "assets/bg.png",
    });

    project.addAsset(asset);
    asset.rename("Changed Outside");

    expect(project.toSnapshot().assets).toEqual([
      { assetId: "a-1", assetName: "背景", assetType: "background", assetPath: "assets/bg.png" },
    ]);
    expect(() => project.addAsset(Asset.create({
      assetId: "a-1",
      assetName: "Duplicate",
      assetType: "voice",
      assetPath: "voices/dup.wav",
    }))).toThrow("Asset already exists: a-1.");
  });

  it("renames through ProjectName rules", () => {
    const project = Project.create({ projectId: "p-1", projectName: "Old" });

    project.rename("  New  ");

    expect(project.toSnapshot().projectName).toBe("New");
    expect(() => project.rename("   ")).toThrow("ProjectName is required.");
  });

  it("changes settings through ProjectSettings rules", () => {
    const project = Project.create({ projectId: "p-1", projectName: "Sample" });

    project.changeSettings({ width: 640, height: 480, fps: 24 });

    expect(project.toSnapshot().settings).toEqual({ width: 640, height: 480, fps: 24 });
    expect(() => project.changeSettings({ width: 0, height: 480, fps: 24 })).toThrow(
      "must be a positive integer",
    );
  });

  it("returns snapshot copies instead of internal state", () => {
    const project = Project.restore({
      projectId: "p-1",
      projectName: "Sample",
      settings: { width: 800, height: 600, fps: 24 },
      scenes: [{ sceneId: "s-1" }],
      assets: [{ assetId: "a-1", assetName: "背景", assetType: "background", assetPath: "assets/bg.png" }],
      characters: [{ characterId: "c-1" }],
    });

    const snapshot = project.toSnapshot();
    snapshot.settings.width = 999;
    snapshot.scenes[0].sceneId = "mutated";

    expect(project.toSnapshot().settings.width).toBe(800);
    expect(project.toSnapshot().scenes).toEqual([{ sceneId: "s-1" }]);
  });
});

describe("ProjectCollections", () => {
  it("starts with empty arrays", () => {
    expect(ProjectCollections.empty().toSnapshot()).toEqual({
      scenes: [],
      assets: [],
      characters: [],
    });
  });

  it("copies snapshot inputs and outputs", () => {
    const input = {
      scenes: [{ sceneId: "s-1" }],
      assets: [{ assetId: "a-1", assetName: "背景", assetType: "background", assetPath: "assets/bg.png" }],
      characters: [{ characterId: "c-1" }],
    };
    const collections = ProjectCollections.fromSnapshot(input);

    input.scenes[0].sceneId = "mutated";
    const output = collections.toSnapshot();
    output.assets[0].assetId = "mutated";

    expect(collections.toSnapshot()).toEqual({
      scenes: [{ sceneId: "s-1" }],
      assets: [{ assetId: "a-1", assetName: "背景", assetType: "background", assetPath: "assets/bg.png" }],
      characters: [{ characterId: "c-1" }],
    });
  });
});
