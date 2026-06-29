import { describe, expect, it } from "vitest";

import type { ProjectDto } from "../../shared";
import { ProjectJsonSerializer } from "../../storage/src";

const validProject: ProjectDto = {
  schemaVersion: 1,
  projectId: "p-1",
  projectName: "Sample",
  settings: { width: 1080, height: 1920, fps: 30 },
  assets: [],
  characters: [],
  scenes: [],
};

describe("ProjectJsonSerializer", () => {
  it("serializes pretty JSON with a trailing newline", () => {
    const serialized = new ProjectJsonSerializer().serialize(validProject);

    expect(serialized).toBe(`${JSON.stringify(validProject, null, 2)}\n`);
  });

  it("deserializes serialized ProjectDto", () => {
    const serializer = new ProjectJsonSerializer();

    expect(serializer.deserialize(serializer.serialize(validProject))).toEqual(validProject);
  });

  it("throws for invalid JSON", () => {
    expect(() => new ProjectJsonSerializer().deserialize("not-json")).toThrow();
  });

  it.each([
    ["missing projectId", { ...validProject, projectId: undefined }],
    ["blank projectName", { ...validProject, projectName: "   " }],
    ["missing settings", { ...validProject, settings: undefined }],
    ["zero width", { ...validProject, settings: { width: 0, height: 1920, fps: 30 } }],
    ["decimal fps", { ...validProject, settings: { width: 1080, height: 1920, fps: 29.97 } }],
    ["assets not array", { ...validProject, assets: {} }],
    ["characters not array", { ...validProject, characters: null }],
    ["scenes not array", { ...validProject, scenes: "bad" }],
  ])("rejects invalid ProjectDto on serialize: %s", (_label, project) => {
    expect(() => new ProjectJsonSerializer().serialize(project as ProjectDto)).toThrow();
  });

  it.each([
    ["array root", []],
    ["missing projectId", { ...validProject, projectId: undefined }],
    ["blank projectName", { ...validProject, projectName: "   " }],
    ["invalid settings", { ...validProject, settings: { width: 1080, height: -1, fps: 30 } }],
    ["assets not array", { ...validProject, assets: "bad" }],
  ])("rejects invalid ProjectDto on deserialize: %s", (_label, project) => {
    expect(() => new ProjectJsonSerializer().deserialize(JSON.stringify(project))).toThrow();
  });
});
