import type { AddAssetInput, AssetLibraryState, ProjectAssetType, UpdateAssetInput } from "../../../app/src";
import type { AssetDto, AssetTypeDto } from "../../../shared";

export type AssetBrowserUseCase = {
  readonly state: AssetLibraryState;
  addAsset(input: AddAssetInput): AssetLibraryState;
  updateAsset(input: UpdateAssetInput): AssetLibraryState;
  selectAsset(assetId: string): AssetLibraryState;
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

  private createViewState(state: AssetLibraryState): AssetBrowserViewState {
    return {
      title: this.props.title ?? "Asset Browser",
      assets: state.assets.map((asset) => toItemViewState(asset, state.selectedAssetId)),
      selectedAssetId: state.selectedAssetId,
      assetCount: state.assets.length,
      emptyText: state.assets.length === 0 ? "Add assets to use them in scenes." : "",
      addButton: {
        label: "Add Asset",
        disabled: false,
      },
      acceptedTypes: ["background", "character_image", "voice", "bgm", "se"],
    };
  }
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
