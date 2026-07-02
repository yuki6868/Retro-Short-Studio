import type {
  AddAssetInput,
  AssetLibraryState,
  DeleteAssetInput,
  ImportAssetInput,
  ImportableAssetType,
  ProjectAssetType,
  UpdateAssetInput,
} from "../../../app/src";
import type { AssetDto, AssetTypeDto } from "../../../shared";

export type AssetBrowserUseCase = {
  readonly state: AssetLibraryState;
  addAsset(input: AddAssetInput): AssetLibraryState;
  updateAsset(input: UpdateAssetInput): AssetLibraryState;
  deleteAsset(input: DeleteAssetInput): AssetLibraryState;
  selectAsset(assetId: string): AssetLibraryState;
  importAsset?(input: ImportAssetInput): Promise<AssetLibraryState>;
};

export type AssetBrowserProps = {
  title?: string;
  assets: AssetBrowserUseCase;
};

export type AssetBrowserItemViewState = {
  assetId: string;
  assetName: string;
  assetType: AssetTypeDto;
  assetPath: string;
  selected: boolean;
  previewable: boolean;
};

export type AssetBrowserViewState = {
  title: string;
  assets: AssetBrowserItemViewState[];
  selectedAssetId: string | null;
  assetCount: number;
  emptyText: string;
  addButton: {
    label: string;
    disabled: boolean;
  };
  acceptedTypes: ProjectAssetType[];
  importableTypes: ImportableAssetType[];
};

export class AssetBrowser {
  private latestState: AssetLibraryState;

  constructor(private readonly props: AssetBrowserProps) {
    this.latestState = props.assets.state;
  }

  render(): AssetBrowserViewState {
    return this.createViewState(this.latestState);
  }

  clickAdd(input: AddAssetInput): AssetBrowserViewState {
    this.latestState = this.props.assets.addAsset(input);
    return this.render();
  }

  clickSelect(assetId: string): AssetBrowserViewState {
    this.latestState = this.props.assets.selectAsset(assetId);
    return this.render();
  }

  editAsset(input: UpdateAssetInput): AssetBrowserViewState {
    this.latestState = this.props.assets.updateAsset(input);
    return this.render();
  }

  clickDelete(assetId: string): AssetBrowserViewState {
    this.latestState = this.props.assets.deleteAsset({ assetId });
    return this.render();
  }

  async importFile(input: ImportAssetInput): Promise<AssetBrowserViewState> {
    if (this.props.assets.importAsset === undefined) {
      throw new Error("Asset import is not configured.");
    }

    this.latestState = await this.props.assets.importAsset(input);
    return this.render();
  }

  private createViewState(state: AssetLibraryState): AssetBrowserViewState {
    const visibleAssets = compactDuplicateVoiceAssets(state.assets, state.selectedAssetId);
    const selectedAssetId = visibleAssets.some((asset) => asset.assetId === state.selectedAssetId) ? state.selectedAssetId : null;

    return {
      title: this.props.title ?? "Asset Browser",
      assets: visibleAssets.map((asset) => toItemViewState(asset, selectedAssetId)),
      selectedAssetId,
      assetCount: visibleAssets.length,
      emptyText: visibleAssets.length === 0 ? "Add assets to use them in scenes." : "",
      addButton: {
        label: "Add Asset",
        disabled: false,
      },
      acceptedTypes: ["background", "character_image", "voice", "bgm", "se"],
      importableTypes: ["background", "character_image", "voice"],
    };
  }
}

function compactDuplicateVoiceAssets(assets: AssetDto[], selectedAssetId: string | null): AssetDto[] {
  const visibleAssets = new Map<string, AssetDto>();

  for (const asset of assets) {
    const key = asset.assetType === "voice" ? `${asset.assetType}:${asset.assetPath}` : asset.assetId;
    const current = visibleAssets.get(key);

    if (current === undefined || asset.assetId === selectedAssetId) {
      visibleAssets.set(key, asset);
    }
  }

  return Array.from(visibleAssets.values());
}

function toItemViewState(asset: AssetDto, selectedAssetId: string | null): AssetBrowserItemViewState {
  return {
    assetId: asset.assetId,
    assetName: asset.assetName,
    assetType: asset.assetType,
    assetPath: asset.assetPath,
    selected: asset.assetId === selectedAssetId,
    previewable: asset.assetType === "background" || asset.assetType === "character_image",
  };
}
