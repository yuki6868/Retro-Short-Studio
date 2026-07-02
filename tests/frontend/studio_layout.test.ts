import { describe, expect, it } from "vitest";

import { PreviewPanel, StudioLayout } from "../../frontend/src";
import type { PreviewState } from "../../app/src";

describe("StudioLayout", () => {
  it("places the preview region at the center while exposing all studio regions", () => {
    const previewPanel = new PreviewPanel({
      duration: 12,
      preview: createPreviewUseCase(),
    });

    const layout = new StudioLayout({
      preview: previewPanel.render(),
    });

    const view = layout.render();

    expect(view.title).toBe("Retro Short Studio");
    expect(view.order).toEqual(["assetBrowser", "sceneFlow", "preview", "inspector", "timeline"]);
    expect(view.layout.center.id).toBe("preview");
    expect(view.layout.center.preview.title).toBe("Preview");
    expect(view.layout.left.map((region) => region.id)).toEqual(["assetBrowser", "sceneFlow"]);
    expect(view.layout.right.id).toBe("inspector");
    expect(view.layout.bottom.id).toBe("timeline");
  });

  it("renders only minimum placeholder state for regions that are not implemented yet", () => {
    const layout = new StudioLayout({
      title: "RSS Workspace",
      preview: new PreviewPanel({ duration: 8, preview: createPreviewUseCase() }).render(),
    });

    const view = layout.render();

    expect(view.title).toBe("RSS Workspace");
    expect(view.layout.left[0]).toMatchObject({
      title: "Asset Browser",
      placeholderText: "Assets will be listed here.",
      assetCount: 0,
    });
    expect(view.layout.left[1]).toMatchObject({
      title: "Scene Flow",
      placeholderText: "Scenes will be arranged here.",
      sceneCount: 0,
    });
    expect(view.layout.right).toMatchObject({
      title: "Inspector",
      placeholderText: "Select a scene, character, or action to edit it.",
      selectedTargetLabel: "Nothing selected",
    });
    expect(view.layout.bottom).toMatchObject({
      title: "Timeline",
      placeholderText: "Actions will be shown on timeline tracks.",
      trackCount: 0,
    });
  });


  it("passes AssetBrowser view state into the left asset region", () => {
    const assetBrowser = {
      title: "Asset Browser",
      assets: [
        {
          assetId: "asset-1",
          assetName: "Room",
          assetPath: "assets/room.png",
          assetType: "background" as const,
          selected: true,
          previewable: true,
        },
      ],
      selectedAssetId: "asset-1",
      assetCount: 1,
      emptyText: "",
      addButton: { label: "Add Asset", disabled: false },
      acceptedTypes: ["background" as const],
      importableTypes: ["background" as const],
    };

    const view = new StudioLayout({
      preview: new PreviewPanel({ duration: 8, preview: createPreviewUseCase() }).render(),
      assetBrowser,
    }).render();

    expect(view.layout.left[0].assetCount).toBe(1);
    expect(view.layout.left[0].assetBrowser?.assets[0].assetName).toBe("Room");
    expect(view.layout.left[0].placeholderText).toBe("");
  });



  it("passes SceneFlow view state into the left scene region", () => {
    const sceneFlow = {
      title: "Scene Flow",
      scenes: [
        {
          sceneId: "scene-1",
          sceneName: "Opening",
          duration: 6,
          selected: true,
          orderLabel: "01",
        },
      ],
      selectedSceneId: "scene-1",
      sceneCount: 1,
      emptyText: "",
      addButton: { label: "Add Scene", disabled: false },
      canReorder: false,
    };

    const view = new StudioLayout({
      preview: new PreviewPanel({ duration: 8, preview: createPreviewUseCase() }).render(),
      sceneFlow,
    }).render();

    expect(view.layout.left[1].sceneCount).toBe(1);
    expect(view.layout.left[1].sceneFlow?.scenes[0].sceneName).toBe("Opening");
    expect(view.layout.left[1].placeholderText).toBe("");
  });

  it("passes preview panel state through without depending on engine or project internals", () => {
    const preview = new PreviewPanel({
      duration: 6,
      preview: createPreviewUseCase({
        currentTime: 2.5,
        playbackStatus: "playing",
        framePath: "renders/preview-0075.png",
        width: 960,
        height: 540,
        fps: 30,
        error: null,
      }),
    }).render();

    const view = new StudioLayout({ preview }).render();

    expect(view.layout.center.preview.currentTime).toBe(2.5);
    expect(view.layout.center.preview.surface.framePath).toBe("renders/preview-0075.png");
    expect(Object.keys(view.layout.center)).not.toContain("engineClient");
    expect(Object.keys(view.layout.center)).not.toContain("project");
    expect(Object.keys(view.layout.center)).not.toContain("pyxel");
  });

  it("can show counts and selection labels without making each region editable yet", () => {
    const view = new StudioLayout({
      preview: new PreviewPanel({ duration: 8, preview: createPreviewUseCase() }).render(),
      assetCount: 3,
      sceneCount: 2,
      trackCount: 4,
      selectedTargetLabel: "Scene: Opening",
    }).render();

    expect(view.layout.left[0].assetCount).toBe(3);
    expect(view.layout.left[1].sceneCount).toBe(2);
    expect(view.layout.bottom.trackCount).toBe(4);
    expect(view.layout.right.selectedTargetLabel).toBe("Scene: Opening");
  });

  it("rejects invalid display counts before they become UI state", () => {
    const preview = new PreviewPanel({ duration: 8, preview: createPreviewUseCase() }).render();

    expect(() => new StudioLayout({ preview, assetCount: -1 })).toThrow(
      "StudioLayout assetCount must be a non-negative integer.",
    );
    expect(() => new StudioLayout({ preview, sceneCount: 1.5 })).toThrow(
      "StudioLayout sceneCount must be a non-negative integer.",
    );
    expect(() => new StudioLayout({ preview, trackCount: Number.NaN })).toThrow(
      "StudioLayout trackCount must be a non-negative integer.",
    );
  });
});

function createPreviewUseCase(state: PreviewState = initialPreviewState()) {
  return {
    get state() {
      return state;
    },
    play: async () => state,
    pause: () => state,
    seek: async () => state,
  };
}

function initialPreviewState(): PreviewState {
  return {
    currentTime: 0,
    playbackStatus: "paused",
    framePath: null,
    width: 1280,
    height: 720,
    fps: 30,
    error: null,
  };
}
