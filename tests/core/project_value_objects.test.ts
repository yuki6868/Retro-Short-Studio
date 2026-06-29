import { describe, expect, it } from "vitest";

import { ProjectId, ProjectName, ProjectSettings } from "../../core/src";

describe("ProjectId", () => {
  it("trims surrounding spaces", () => {
    expect(ProjectId.create("  project-1  ").toString()).toBe("project-1");
  });

  it("rejects empty values", () => {
    expect(() => ProjectId.create("   ")).toThrow("ProjectId is required.");
  });

  it("compares by value", () => {
    expect(ProjectId.create("same").equals(ProjectId.create("same"))).toBe(true);
    expect(ProjectId.create("same").equals(ProjectId.create("other"))).toBe(false);
  });
});

describe("ProjectName", () => {
  it("trims surrounding spaces", () => {
    expect(ProjectName.create("  Sample Project  ").toString()).toBe("Sample Project");
  });

  it("rejects empty values", () => {
    expect(() => ProjectName.create("\t\n ")).toThrow("ProjectName is required.");
  });
});

describe("ProjectSettings", () => {
  it("creates the vertical short default", () => {
    expect(ProjectSettings.defaultVerticalShort().toValues()).toEqual({
      width: 1080,
      height: 1920,
      fps: 30,
    });
  });

  it("accepts positive integer settings", () => {
    expect(
      ProjectSettings.create({ width: 720, height: 1280, fps: 60 }).toValues(),
    ).toEqual({ width: 720, height: 1280, fps: 60 });
  });

  it.each([
    ["width", { width: 0, height: 1920, fps: 30 }],
    ["height", { width: 1080, height: -1, fps: 30 }],
    ["fps", { width: 1080, height: 1920, fps: 29.97 }],
  ])("rejects invalid %s", (_label, settings) => {
    expect(() => ProjectSettings.create(settings)).toThrow("must be a positive integer");
  });

  it("returns copies instead of exposing internal state", () => {
    const settings = ProjectSettings.create({ width: 100, height: 200, fps: 30 });
    const values = settings.toValues();

    values.width = 999;

    expect(settings.toValues()).toEqual({ width: 100, height: 200, fps: 30 });
  });
});
