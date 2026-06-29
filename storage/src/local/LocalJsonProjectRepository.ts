import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { IProjectSerializer, ProjectDto, ProjectSettingsDto } from "../../../shared";
import type {
  CreateProjectOptions,
  CreatedProject,
  ProjectRepository,
} from "../contracts/ProjectRepository";
import { ensureProjectFolder } from "./ProjectFolderInitializer";
import { resolveProjectFolderPaths } from "./ProjectFolderLayout";
import { ProjectJsonSerializer } from "./ProjectJsonSerializer";

const DEFAULT_PROJECTS_ROOT_PATH = "projects";

const DEFAULT_PROJECT_SETTINGS: ProjectSettingsDto = {
  width: 1080,
  height: 1920,
  fps: 30,
};

export class LocalJsonProjectRepository implements ProjectRepository {
  constructor(
    private readonly serializer: IProjectSerializer = new ProjectJsonSerializer(),
  ) {}

  async create(
    projectName: string,
    options: CreateProjectOptions = {},
  ): Promise<CreatedProject> {
    const normalizedProjectName = normalizeProjectName(projectName);
    const projectsRootPath = options.projectsRootPath ?? DEFAULT_PROJECTS_ROOT_PATH;
    const projectPath = path.join(projectsRootPath, normalizedProjectName);

    await ensureProjectFolder(projectPath);

    const project: ProjectDto = {
      projectId: randomUUID(),
      projectName,
      settings: {
        ...DEFAULT_PROJECT_SETTINGS,
        ...options.settings,
      },
      assets: [],
      characters: [],
      scenes: [],
    };

    await this.save(projectPath, project);

    return {
      projectPath,
      project,
    };
  }

  async load(projectPath: string): Promise<ProjectDto> {
    const { projectFilePath } = resolveProjectFolderPaths(projectPath);
    const rawProjectJson = await readFile(projectFilePath, "utf-8");
    return this.serializer.deserialize(rawProjectJson);
  }

  async save(projectPath: string, project: ProjectDto): Promise<void> {
    await ensureProjectFolder(projectPath);

    const { projectFilePath } = resolveProjectFolderPaths(projectPath);
    const projectJson = this.serializer.serialize(project);

    await writeFile(projectFilePath, projectJson, "utf-8");
  }
}

function normalizeProjectName(projectName: string): string {
  const trimmedProjectName = projectName.trim();

  if (trimmedProjectName.length === 0) {
    throw new Error("Project name is required.");
  }

  return trimmedProjectName
    .replace(/[\\/:*?\"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .toLowerCase();
}
