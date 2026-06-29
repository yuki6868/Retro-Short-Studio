import { AssetId, AssetName, AssetPath, AssetType } from "./valueObjects";

export type AssetSnapshot = {
  assetId: string;
  assetName: string;
  assetType: string;
  assetPath: string;
};

export class Asset {
  private constructor(
    private readonly id: AssetId,
    private name: AssetName,
    private readonly type: AssetType,
    private path: AssetPath,
  ) {}

  static create(params: {
    assetId: string;
    assetName: string;
    assetType: string;
    assetPath: string;
  }): Asset {
    return new Asset(
      AssetId.create(params.assetId),
      AssetName.create(params.assetName),
      AssetType.create(params.assetType),
      AssetPath.create(params.assetPath),
    );
  }

  static restore(snapshot: AssetSnapshot): Asset {
    return Asset.create(snapshot);
  }

  rename(assetName: string): void {
    this.name = AssetName.create(assetName);
  }

  changePath(assetPath: string): void {
    this.path = AssetPath.create(assetPath);
  }

  toSnapshot(): AssetSnapshot {
    return {
      assetId: this.id.toString(),
      assetName: this.name.toString(),
      assetType: this.type.toString(),
      assetPath: this.path.toString(),
    };
  }
}
