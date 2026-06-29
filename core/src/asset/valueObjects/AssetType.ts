export const assetTypeValues = [
  "background",
  "character_image",
  "voice",
  "bgm",
  "se",
] as const;

export type AssetTypeValue = (typeof assetTypeValues)[number];

export class AssetType {
  private constructor(private readonly value: AssetTypeValue) {}

  static create(value: string): AssetType {
    if (isAssetTypeValue(value)) {
      return new AssetType(value);
    }

    throw new Error(`Unsupported AssetType: ${value}.`);
  }

  toString(): AssetTypeValue {
    return this.value;
  }
}

function isAssetTypeValue(value: string): value is AssetTypeValue {
  return (assetTypeValues as readonly string[]).includes(value);
}
