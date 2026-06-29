import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ensureProjectFolder, PROJECT_FILE_NAME, resolveProjectFolderPaths } from "../../storage/src";

let tempRoot: string;

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(os.tmpdir(), "rss-folder-"));
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

describe("resolveProjectFolderPaths", () => {
  it("resolves the project file path", () => {
    const paths = resolveProjectFolderPaths("projects/sample");

    expect(paths.projectFilePath).toBe(path.join("projects/sample", PROJECT_FILE_NAME));
  });

  it("resolves all standard folders without touching the file system", () => {
    const projectPath = path.join(tempRoot, "sample");
    const paths = resolveProjectFolderPaths(projectPath);

    expect(paths.folders).toEqual({
      assets: path.join(projectPath, "assets"),
      characters: path.join(projectPath, "assets/characters"),
      backgrounds: path.join(projectPath, "assets/backgrounds"),
      effects: path.join(projectPath, "assets/effects"),
      voices: path.join(projectPath, "voices"),
      renders: path.join(projectPath, "renders"),
      exports: path.join(projectPath, "exports"),
    });
    expect(existsSync(projectPath)).toBe(false);
  });
});

describe("ensureProjectFolder", () => {
  it("creates the project root and all standard folders", async () => {
    const projectPath = path.join(tempRoot, "sample");

    await ensureProjectFolder(projectPath);

    const paths = resolveProjectFolderPaths(projectPath);
    expect(existsSync(paths.projectRootPath)).toBe(true);
    for (const folderPath of Object.values(paths.folders)) {
      expect(existsSync(folderPath)).toBe(true);
    }
  });

  it("is idempotent and keeps existing files", async () => {
    const projectPath = path.join(tempRoot, "sample");
    await ensureProjectFolder(projectPath);
    const markerPath = path.join(projectPath, "assets", "marker.txt");
    await writeFile(markerPath, "keep", "utf-8");

    await ensureProjectFolder(projectPath);

    expect(readFileSync(markerPath, "utf-8")).toBe("keep");
  });
});
