export class AssetPath {
  private constructor(private readonly value: string) {}

  static create(value: string): AssetPath {
    const normalizedValue = value.trim();

    if (normalizedValue.length === 0) {
      throw new Error("AssetPath is required.");
    }

    if (normalizedValue.includes("\\0")) {
      throw new Error("AssetPath must not contain null bytes.");
    }

    return new AssetPath(normalizedValue);
  }

  toString(): string {
    return this.value;
  }
}
