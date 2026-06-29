import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ProjectDto, ProjectSettingsDto } from "../../../shared";
import type {
  CreateProjectOptions,
  CreatedProject,
  ProjectRepository,
} from "../contracts/ProjectRepository";
import { PROJECT_FILE_NAME, PROJECT_FOLDER_NAMES } from "./ProjectFolderLayout";

const DEFAULT_PROJECTS_ROOT_PATH = "projects";

const DEFAULT_PROJECT_SETTINGS: ProjectSettingsDto = {
  width: 1080,
  height: 1920,
  fps: 30,
};

export class LocalJsonProjectRepository implements ProjectRepository {
  async create(
    projectName: string,
    options: CreateProjectOptions = {},
  ): Promise<CreatedProject> {
    const normalizedProjectName = normalizeProjectName(projectName);
    const projectsRootPath = options.projectsRootPath ?? DEFAULT_PROJECTS_ROOT_PATH;
    const projectPath = path.join(projectsRootPath, normalizedProjectName);

    await createProjectFolders(projectPath);

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
    const projectFilePath = path.join(projectPath, PROJECT_FILE_NAME);
    const rawProjectJson = await readFile(projectFilePath, "utf-8");
    return JSON.parse(rawProjectJson) as ProjectDto;
  }

  async save(projectPath: string, project: ProjectDto): Promise<void> {
    await createProjectFolders(projectPath);

    const projectFilePath = path.join(projectPath, PROJECT_FILE_NAME);
    const projectJson = JSON.stringify(project, null, 2);

    await writeFile(projectFilePath, `${projectJson}\n`, "utf-8");
  }
}

async function createProjectFolders(projectPath: string): Promise<void> {
  await mkdir(projectPath, { recursive: true });

  await Promise.all(
    Object.values(PROJECT_FOLDER_NAMES).map((folderName) =>
      mkdir(path.join(projectPath, folderName), { recursive: true }),
    ),
  );
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
