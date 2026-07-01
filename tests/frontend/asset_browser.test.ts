import { describe, expect, it } from "vitest";

import { AssetBrowser, type AssetBrowserUseCase } from "../../frontend/src";
import type { AddAssetInput, AssetLibraryState } from "../../app/src";

describe("AssetBrowser", () => {
  it("renders an empty asset browser with add affordance", () => {
    const browser = new AssetBrowser({ assets: createAssetUseCase(emptyState()) });

    const view = browser.render();

    expect(view.title).toBe("Asset Browser");
    expect(view.assets).toEqual([]);
    expect(view.emptyText).toBe("Add assets to use them in scenes.");
    expect(view.addButton).toEqual({ label: "Add Asset", disabled: false });
    expect(view.acceptedTypes).toEqual(["background", "character_image", "voice", "bgm", "se"]);
  });

  it("delegates asset addition to the asset use case", () => {
    const calls: AddAssetInput[] = [];
    const browser = new AssetBrowser({
      assets: createAssetUseCase(emptyState(), {
        addAsset: (input) => {
          calls.push(input);
          return {
            assets: [
              {
                assetId: "asset-1",
                assetName: input.assetName,
                assetPath: input.assetPath,
                assetType: input.assetType,
              },
            ],
            selectedAssetId: "asset-1",
          };
        },
      }),
    });

    const view = browser.clickAdd({
      assetName: "Room Background",
      assetPath: "assets/backgrounds/room.png",
      assetType: "background",
    });

    expect(calls).toEqual([
      {
        assetName: "Room Background",
        assetPath: "assets/backgrounds/room.png",
        assetType: "background",
      },
    ]);
    expect(view.assetCount).toBe(1);
    expect(view.selectedAssetId).toBe("asset-1");
    expect(view.assets[0]).toMatchObject({ assetName: "Room Background", selected: true, previewable: true });
  });

  it("delegates asset metadata edits to the asset use case", () => {
    const calls = [] as Parameters<AssetBrowserUseCase["updateAsset"]>[0][];
    const browser = new AssetBrowser({
      assets: createAssetUseCase(
        {
          assets: [{ assetId: "asset-1", assetName: "Asset 1", assetPath: "assets/asset-1.png", assetType: "background" }],
          selectedAssetId: "asset-1",
        },
        {
          updateAsset: (input) => {
            calls.push(input);
            return {
              assets: [
                {
                  assetId: input.assetId,
                  assetName: input.assetName ?? "Asset 1",
                  assetPath: input.assetPath ?? "assets/asset-1.png",
                  assetType: input.assetType ?? "background",
                },
              ],
              selectedAssetId: input.assetId,
            };
          },
        },
      ),
    });

    const view = browser.editAsset({
      assetId: "asset-1",
      assetName: "Room Background",
      assetPath: "assets/backgrounds/room.png",
    });

    expect(calls).toEqual([
      { assetId: "asset-1", assetName: "Room Background", assetPath: "assets/backgrounds/room.png" },
    ]);
    expect(view.assets[0]).toMatchObject({ assetName: "Room Background", assetPath: "assets/backgrounds/room.png" });
  });



  it("compacts duplicate generated voice assets in the browser view", () => {
    const browser = new AssetBrowser({
      assets: createAssetUseCase({
        assets: [
          { assetId: "voice-1", assetName: "Voice action-talk-opening", assetPath: "projects/voices/action-talk-opening.wav", assetType: "voice" },
          { assetId: "voice-2", assetName: "Voice action-talk-opening", assetPath: "projects/voices/action-talk-opening.wav", assetType: "voice" },
          { assetId: "bg-1", assetName: "Opening Background", assetPath: "assets/backgrounds/opening.png", assetType: "background" },
        ],
        selectedAssetId: "voice-2",
      }),
    });

    const view = browser.render();

    expect(view.assetCount).toBe(2);
    expect(view.assets.map((asset) => asset.assetId)).toEqual(["voice-2", "bg-1"]);
    expect(view.assets[0]).toMatchObject({ selected: true, assetPath: "projects/voices/action-talk-opening.wav" });
  });

  it("delegates selection to the asset use case and reflects selected row state", () => {
    const selectedIds: string[] = [];
    const browser = new AssetBrowser({
      assets: createAssetUseCase(
        {
          assets: [
            { assetId: "asset-1", assetName: "Room", assetPath: "assets/room.png", assetType: "background" },
            { assetId: "asset-2", assetName: "Voice", assetPath: "voices/line.wav", assetType: "voice" },
          ],
          selectedAssetId: null,
        },
        {
          selectAsset: (assetId) => {
            selectedIds.push(assetId);
            return {
              assets: [
                { assetId: "asset-1", assetName: "Room", assetPath: "assets/room.png", assetType: "background" },
                { assetId: "asset-2", assetName: "Voice", assetPath: "voices/line.wav", assetType: "voice" },
              ],
              selectedAssetId: assetId,
            };
          },
        },
      ),
    });

    const view = browser.clickSelect("asset-2");

    expect(selectedIds).toEqual(["asset-2"]);
    expect(view.assets.map((asset) => [asset.assetId, asset.selected])).toEqual([
      ["asset-1", false],
      ["asset-2", true],
    ]);
  });

  it("does not expose Project, Scene, or Engine details to the browser view", () => {
    const browser = new AssetBrowser({
      assets: createAssetUseCase({
        assets: [{ assetId: "asset-1", assetName: "Room", assetPath: "assets/room.png", assetType: "background" }],
        selectedAssetId: "asset-1",
      }),
    });

    const view = browser.render();

    expect(Object.keys(view)).not.toContain("project");
    expect(Object.keys(view)).not.toContain("scene");
    expect(Object.keys(view)).not.toContain("engineClient");
    expect(view.assets[0]).not.toHaveProperty("projectAsset");
  });
});

function emptyState(): AssetLibraryState {
  return {
    assets: [],
    selectedAssetId: null,
  };
}

function createAssetUseCase(
  state: AssetLibraryState,
  overrides: Partial<Pick<AssetBrowserUseCase, "addAsset" | "updateAsset" | "selectAsset">> = {},
): AssetBrowserUseCase {
  return {
    get state() {
      return state;
    },
    addAsset: overrides.addAsset ?? (() => state),
    updateAsset: overrides.updateAsset ?? (() => state),
    selectAsset: overrides.selectAsset ?? (() => state),
  };
}
