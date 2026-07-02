import { afterEach, describe, expect, it, vi } from "vitest";

import { BackendProjectFolderFileStore } from "../../frontend/src/react";

describe("BackendProjectFolderFileStore", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uploads imported assets to the backend project folder endpoint", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const store = new BackendProjectFolderFileStore({ getProjectId: () => "project-1", backendBaseUrl: "http://backend.test" });

    await store.write({ relativePath: "assets/backgrounds/bg.png", data: new Uint8Array([1, 2, 3]) });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://backend.test/api/projects/project-1/files?relativePath=assets%2Fbackgrounds%2Fbg.png",
      expect.objectContaining({
        method: "PUT",
        headers: { "Content-Type": "application/octet-stream" },
        body: expect.any(ArrayBuffer),
      }),
    );
  });

  it("checks duplicate asset paths through the backend", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ exists: true }), { status: 200 })));
    const store = new BackendProjectFolderFileStore({ getProjectId: () => "project-1", backendBaseUrl: "http://backend.test" });

    await expect(store.exists("assets/backgrounds/bg.png")).resolves.toBe(true);
  });

  it("writes project.json through the backend", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const store = new BackendProjectFolderFileStore({ getProjectId: () => "project-1", backendBaseUrl: "http://backend.test" });

    await expect(store.writeProjectJson('{"projectName":"Demo"}')).resolves.toEqual({
      folderName: "projects/project-1",
      projectJsonPath: "project.json",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://backend.test/api/projects/project-1/files?relativePath=project.json",
      expect.objectContaining({
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: '{"projectName":"Demo"}',
      }),
    );
  });
});
