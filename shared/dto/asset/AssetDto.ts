export type AssetTypeDto =
  | "background"
  | "character_image"
  | "voice"
  | "bgm"
  | "se"
  | "effect";

export type AssetDto = {
  assetId: string;
  assetName: string;
  assetType: AssetTypeDto;
  assetPath: string;
};
