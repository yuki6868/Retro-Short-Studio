import type { IProjectSerializer, ProjectDto } from "../../../shared";

export class ProjectJsonSerializer implements IProjectSerializer {
  serialize(project: ProjectDto): string {
    assertProjectDto(project);
    return `${JSON.stringify(project, null, 2)}\n`;
  }

  deserialize(serializedProject: string): ProjectDto {
    const parsedProject: unknown = JSON.parse(serializedProject);
    assertProjectDto(parsedProject);
    return parsedProject;
  }
}

function assertProjectDto(value: unknown): asserts value is ProjectDto {
  assertPlainObject(value, "ProjectDto");

  assertNonEmptyString(value.projectId, "ProjectDto.projectId");
  assertNonEmptyString(value.projectName, "ProjectDto.projectName");
  assertProjectSettingsDto(value.settings);
  assertArray(value.assets, "ProjectDto.assets");
  assertArray(value.characters, "ProjectDto.characters");
  assertArray(value.scenes, "ProjectDto.scenes");
}

function assertProjectSettingsDto(value: unknown): void {
  assertPlainObject(value, "ProjectDto.settings");

  assertPositiveInteger(value.width, "ProjectDto.settings.width");
  assertPositiveInteger(value.height, "ProjectDto.settings.height");
  assertPositiveInteger(value.fps, "ProjectDto.settings.fps");
}

function assertPlainObject(
  value: unknown,
  label: string,
): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function assertNonEmptyString(value: unknown, label: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function assertPositiveInteger(value: unknown, label: string): void {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
}

function assertArray(value: unknown, label: string): void {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }
}
