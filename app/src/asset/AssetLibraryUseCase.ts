import { Asset, type AssetSnapshot } from "../../../core/src";
import type { IdGenerator, Project } from "../../../core/src";
import type { AssetDto, AssetTypeDto } from "../../../shared";

export type ProjectAssetType = Exclude<AssetTypeDto, "effect">;

export type AddAssetInput = {
  assetName: string;
  assetType: ProjectAssetType;
  assetPath: string;
};

export type AssetLibraryState = {
  assets: AssetDto[];
  selectedAssetId: string | null;
};

export type AssetLibraryUseCaseConfig = {
  project: Project;
  idGenerator: IdGenerator;
};

export class AssetLibraryUseCase {
  private selectedAssetId: string | null = null;

  constructor(private readonly config: AssetLibraryUseCaseConfig) {}

  get state(): AssetLibraryState {
    return this.createState();
  }

  listAssets(): AssetDto[] {
    return this.createAssets();
  }

  addAsset(input: AddAssetInput): AssetLibraryState {
    const asset = Asset.create({
      assetId: this.config.idGenerator.generate("asset"),
      assetName: input.assetName,
      assetType: input.assetType,
      assetPath: input.assetPath,
    });

    this.config.project.addAsset(asset);
    this.selectedAssetId = asset.toSnapshot().assetId;
    return this.createState();
  }

  selectAsset(assetId: string): AssetLibraryState {
    const normalizedAssetId = assetId.trim();

    if (normalizedAssetId.length === 0) {
      throw new Error("Selected assetId is required.");
    }

    if (!this.createAssets().some((asset) => asset.assetId === normalizedAssetId)) {
      throw new Error(`Asset does not exist: ${normalizedAssetId}.`);
    }

    this.selectedAssetId = normalizedAssetId;
    return this.createState();
  }

  private createState(): AssetLibraryState {
    const assets = this.createAssets();

    return {
      assets,
      selectedAssetId: assets.some((asset) => asset.assetId === this.selectedAssetId) ? this.selectedAssetId : null,
    };
  }

  private createAssets(): AssetDto[] {
    return this.config.project.toSnapshot().assets.map(toAssetDto);
  }
}

function toAssetDto(asset: AssetSnapshot): AssetDto {
  return {
    assetId: asset.assetId,
    assetName: asset.assetName,
    assetType: asset.assetType as AssetTypeDto,
    assetPath: asset.assetPath,
  };
}
