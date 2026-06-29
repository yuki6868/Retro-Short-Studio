export class SceneId {
  private constructor(private readonly value: string) {}

  static create(value: string): SceneId {
    const normalizedValue = value.trim();

    if (normalizedValue.length === 0) {
      throw new Error("SceneId is required.");
    }

    return new SceneId(normalizedValue);
  }

  toString(): string {
    return this.value;
  }

  equals(other: SceneId): boolean {
    return this.value === other.value;
  }
}
