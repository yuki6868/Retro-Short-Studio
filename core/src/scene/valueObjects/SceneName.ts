export class SceneName {
  private constructor(private readonly value: string) {}

  static create(value: string): SceneName {
    const normalizedValue = value.trim();

    if (normalizedValue.length === 0) {
      throw new Error("SceneName is required.");
    }

    return new SceneName(normalizedValue);
  }

  toString(): string {
    return this.value;
  }
}
