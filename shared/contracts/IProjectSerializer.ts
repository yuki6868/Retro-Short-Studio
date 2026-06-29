import type { ProjectDto } from "../dto";

export interface IProjectSerializer {
  serialize(project: ProjectDto): string;
  deserialize(serializedProject: string): ProjectDto;
}
