import type { IProjectSerializer, ProjectDto } from "../../../shared";

export class ProjectJsonSerializer implements IProjectSerializer {
  serialize(project: ProjectDto): string {
    return `${JSON.stringify(project, null, 2)}\n`;
  }

  deserialize(serializedProject: string): ProjectDto {
    return JSON.parse(serializedProject) as ProjectDto;
  }
}
