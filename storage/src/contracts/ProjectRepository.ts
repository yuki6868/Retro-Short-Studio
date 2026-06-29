import type { ProjectDto, ProjectSettingsDto } from "../../../shared";

export type CreateProjectOptions = {
  projectsRootPath?: string;
  settings?: Partial<ProjectSettingsDto>;
};

export type CreatedProject = {
  projectPath: string;
  project: ProjectDto;
};

export interface ProjectRepository {
  create(projectName: string, options?: CreateProjectOptions): Promise<CreatedProject>;
  load(projectPath: string): Promise<ProjectDto>;
  save(projectPath: string, project: ProjectDto): Promise<void>;
}
