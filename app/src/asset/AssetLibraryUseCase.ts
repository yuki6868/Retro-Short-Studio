import { Asset, type AssetSnapshot } from "../../../core/src";
import type { IdGenerator, Project } from "../../../core/src";
import type { AssetDto, AssetTypeDto } from "../../../shared";

export type ProjectAssetType = Exclude<AssetTypeDto, "effect">;

export type AddAssetInput = {
  assetName: string;
  assetType: ProjectAssetType;
  assetPath: string;
};

export type UpdateAssetInput = {
  assetId: string;
  assetName?: string;
  assetType?: ProjectAssetType;
  assetPath?: string;
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

  updateAsset(input: UpdateAssetInput): AssetLibraryState {
    const assetId = normalizeAssetId(input.assetId);
    this.ensureAssetExists(assetId);

    this.config.project.updateAsset(assetId, (asset) => {
      if (input.assetName !== undefined) {
        asset.rename(input.assetName);
      }

      if (input.assetType !== undefined) {
        asset.changeType(input.assetType);
      }

      if (input.assetPath !== undefined) {
        asset.changePath(input.assetPath);
      }
    });

    this.selectedAssetId = assetId;
    return this.createState();
  }

  selectAsset(assetId: string): AssetLibraryState {
    const normalizedAssetId = normalizeAssetId(assetId);
    this.ensureAssetExists(normalizedAssetId);

    this.selectedAssetId = normalizedAssetId;
    return this.createState();
  }

  private ensureAssetExists(assetId: string): void {
    if (!this.createAssets().some((asset) => asset.assetId === assetId)) {
      throw new Error(`Asset does not exist: ${assetId}.`);
    }
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

function normalizeAssetId(assetId: string): string {
  const normalizedAssetId = assetId.trim();

  if (normalizedAssetId.length === 0) {
    throw new Error("Selected assetId is required.");
  }

  return normalizedAssetId;
}
