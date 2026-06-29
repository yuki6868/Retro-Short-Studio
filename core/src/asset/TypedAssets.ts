import { Asset, type AssetSnapshot } from "./Asset";

export type BackgroundAssetSnapshot = AssetSnapshot & { assetType: "background" };
export type CharacterImageAssetSnapshot = AssetSnapshot & { assetType: "character_image" };
export type VoiceAssetSnapshot = AssetSnapshot & { assetType: "voice" };
export type BgmAssetSnapshot = AssetSnapshot & { assetType: "bgm" };
export type SeAssetSnapshot = AssetSnapshot & { assetType: "se" };

export class BackgroundAsset {
  static create(params: Omit<BackgroundAssetSnapshot, "assetType">): Asset {
    return Asset.create({ ...params, assetType: "background" });
  }
}

export class CharacterImageAsset {
  static create(params: Omit<CharacterImageAssetSnapshot, "assetType">): Asset {
    return Asset.create({ ...params, assetType: "character_image" });
  }
}

export class VoiceAsset {
  static create(params: Omit<VoiceAssetSnapshot, "assetType">): Asset {
    return Asset.create({ ...params, assetType: "voice" });
  }
}

export class BgmAsset {
  static create(params: Omit<BgmAssetSnapshot, "assetType">): Asset {
    return Asset.create({ ...params, assetType: "bgm" });
  }
}

export class SeAsset {
  static create(params: Omit<SeAssetSnapshot, "assetType">): Asset {
    return Asset.create({ ...params, assetType: "se" });
  }
}
