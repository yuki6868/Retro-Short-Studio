export class ProjectId {
  private constructor(private readonly value: string) {}

  static create(value: string): ProjectId {
    const normalizedValue = value.trim();

    if (normalizedValue.length === 0) {
      throw new Error("ProjectId is required.");
    }

    return new ProjectId(normalizedValue);
  }

  toString(): string {
    return this.value;
  }

  equals(other: ProjectId): boolean {
    return this.value === other.value;
  }
}
