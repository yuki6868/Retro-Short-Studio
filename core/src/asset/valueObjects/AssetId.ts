export class AssetId {
  private constructor(private readonly value: string) {}

  static create(value: string): AssetId {
    const normalizedValue = value.trim();

    if (normalizedValue.length === 0) {
      throw new Error("AssetId is required.");
    }

    return new AssetId(normalizedValue);
  }

  toString(): string {
    return this.value;
  }

  equals(other: AssetId): boolean {
    return this.value === other.value;
  }
}
