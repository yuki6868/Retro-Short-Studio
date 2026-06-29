export class ProjectName {
  private constructor(private readonly value: string) {}

  static create(value: string): ProjectName {
    const normalizedValue = value.trim();

    if (normalizedValue.length === 0) {
      throw new Error("ProjectName is required.");
    }

    return new ProjectName(normalizedValue);
  }

  toString(): string {
    return this.value;
  }
}
