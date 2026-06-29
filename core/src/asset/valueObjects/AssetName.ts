export class AssetName {
  private constructor(private readonly value: string) {}

  static create(value: string): AssetName {
    const normalizedValue = value.trim();

    if (normalizedValue.length === 0) {
      throw new Error("AssetName is required.");
    }

    return new AssetName(normalizedValue);
  }

  toString(): string {
    return this.value;
  }
}
