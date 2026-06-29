export type ProjectSettingsValues = {
  width: number;
  height: number;
  fps: number;
};

export class ProjectSettings {
  private constructor(private readonly values: ProjectSettingsValues) {}

  static create(values: ProjectSettingsValues): ProjectSettings {
    assertPositiveInteger(values.width, "Project width");
    assertPositiveInteger(values.height, "Project height");
    assertPositiveInteger(values.fps, "Project fps");

    return new ProjectSettings({ ...values });
  }

  static defaultVerticalShort(): ProjectSettings {
    return ProjectSettings.create({
      width: 1080,
      height: 1920,
      fps: 30,
    });
  }

  toValues(): ProjectSettingsValues {
    return { ...this.values };
  }
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
}
