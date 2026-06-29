import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { ProjectDto } from "../../shared";
import { LocalJsonProjectRepository, PROJECT_FILE_NAME, resolveProjectFolderPaths } from "../../storage/src";

let tempRoot: string;

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(os.tmpdir(), "rss-repo-"));
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

describe("LocalJsonProjectRepository", () => {
  it("creates a normalized project folder while storing the trimmed display name", async () => {
    const repository = new LocalJsonProjectRepository();

    const created = await repository.create("  My First/Video  ", {
      projectsRootPath: tempRoot,
    });

    expect(created.projectPath).toBe(path.join(tempRoot, "my-first-video"));
    expect(created.project.projectName).toBe("My First/Video");
    expect(existsSync(created.projectPath)).toBe(true);
  });

  it("creates a default project file and standard folders", async () => {
    const repository = new LocalJsonProjectRepository();

    const created = await repository.create("Sample", { projectsRootPath: tempRoot });

    const paths = resolveProjectFolderPaths(created.projectPath);
    expect(existsSync(paths.projectFilePath)).toBe(true);
    expect(JSON.parse(await readFile(paths.projectFilePath, "utf-8"))).toEqual(created.project);
    expect(created.project.settings).toEqual({ width: 1080, height: 1920, fps: 30 });
    for (const folderPath of Object.values(paths.folders)) {
      expect(existsSync(folderPath)).toBe(true);
    }
  });

  it("merges custom settings when creating a project", async () => {
    const repository = new LocalJsonProjectRepository();

    const created = await repository.create("Sample", {
      projectsRootPath: tempRoot,
      settings: { fps: 60 },
    });

    expect(created.project.settings).toEqual({ width: 1080, height: 1920, fps: 60 });
  });

  it.each(["", "   ", "///", "***", "<>|?"])(
    "rejects invalid project names: %s",
    async (projectName) => {
      const repository = new LocalJsonProjectRepository();

      await expect(
        repository.create(projectName, { projectsRootPath: tempRoot }),
      ).rejects.toThrow(/Project (name|folder name) is required/);
    },
  );

  it("load reads project.rss.json", async () => {
    const repository = new LocalJsonProjectRepository();
    const projectPath = path.join(tempRoot, "sample");
    const project: ProjectDto = {
      projectId: "p-1",
      projectName: "Sample",
      settings: { width: 100, height: 200, fps: 30 },
      assets: [],
      characters: [],
      scenes: [],
    };
    await repository.save(projectPath, project);

    await writeFile(
      path.join(projectPath, PROJECT_FILE_NAME),
      JSON.stringify({ ...project, projectName: "Loaded" }, null, 2),
      "utf-8",
    );

    await expect(repository.load(projectPath)).resolves.toEqual({
      ...project,
      projectName: "Loaded",
    });
  });

  it("load rejects invalid project files through the serializer", async () => {
    const repository = new LocalJsonProjectRepository();
    const projectPath = path.join(tempRoot, "sample");
    await repository.create("Sample", { projectsRootPath: tempRoot });
    await writeFile(
      path.join(projectPath, PROJECT_FILE_NAME),
      JSON.stringify({ projectId: "p-1" }),
      "utf-8",
    );

    await expect(repository.load(projectPath)).rejects.toThrow("ProjectDto.projectName");
  });

  it("save overwrites project.rss.json", async () => {
    const repository = new LocalJsonProjectRepository();
    const projectPath = path.join(tempRoot, "sample");
    const project: ProjectDto = {
      projectId: "p-1",
      projectName: "Before",
      settings: { width: 100, height: 200, fps: 30 },
      assets: [],
      characters: [],
      scenes: [],
    };

    await repository.save(projectPath, project);
    await repository.save(projectPath, { ...project, projectName: "After" });

    expect(JSON.parse(await readFile(path.join(projectPath, PROJECT_FILE_NAME), "utf-8"))).toMatchObject({
      projectName: "After",
    });
  });

  it("save creates a missing project folder", async () => {
    const repository = new LocalJsonProjectRepository();
    const projectPath = path.join(tempRoot, "missing");

    await repository.save(projectPath, {
      projectId: "p-1",
      projectName: "Sample",
      settings: { width: 100, height: 200, fps: 30 },
      assets: [],
      characters: [],
      scenes: [],
    });

    expect(existsSync(path.join(projectPath, PROJECT_FILE_NAME))).toBe(true);
  });
});
