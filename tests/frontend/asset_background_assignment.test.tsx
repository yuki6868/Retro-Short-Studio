import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { PreviewPanel, StudioLayout, shouldApplyAssetSelectionToSceneBackground } from "../../frontend/src";
import { StudioWorkspace, type StudioWorkspaceProps } from "../../frontend/src/react/StudioWorkspace";
import type { AssetLibraryState, InspectorState, PreviewState, SceneFlowState } from "../../app/src";

describe("Asset Browser scene background assignment", () => {
  it("treats a selected background asset as assignable when a scene inspector is active", () => {
    expect(shouldApplyAssetSelectionToSceneBackground({ assetType: "background", selectedSceneId: "scene-1" })).toBe(true);
    expect(shouldApplyAssetSelectionToSceneBackground({ assetType: "voice", selectedSceneId: "scene-1" })).toBe(false);
    expect(shouldApplyAssetSelectionToSceneBackground({ assetType: "background", selectedSceneId: null })).toBe(false);
  });

  it("renders an explicit Set as scene background action for background assets", () => {
    const html = renderToStaticMarkup(<StudioWorkspace {...createWorkspaceProps()} />);

    expect(html).toContain("Room / background");
    expect(html).toContain("Line / voice");
    expect(html).toContain("Set as scene background");
  });
});

function createWorkspaceProps(): StudioWorkspaceProps {
  const preview = new PreviewPanel({ duration: 8, preview: createPreviewUseCase() }).render();
  const view = new StudioLayout({
    preview,
    assetBrowser: {
      title: "Asset Browser",
      assets: [
        {
          assetId: "asset-bg-1",
          assetName: "Room",
          assetPath: "assets/backgrounds/room.png",
          assetType: "background",
          selected: false,
          previewable: true,
        },
        {
          assetId: "asset-voice-1",
          assetName: "Line",
          assetPath: "voices/line.wav",
          assetType: "voice",
          selected: false,
          previewable: false,
        },
      ],
      selectedAssetId: null,
      assetCount: 2,
      emptyText: "",
      addButton: { label: "Add Asset", disabled: false },
      acceptedTypes: ["background", "character_image", "voice", "bgm", "se"],
      importableTypes: ["background", "character_image", "voice"],
    },
    inspector: {
      type: "scene",
      title: "Scene Inspector",
      selectedTargetLabel: "Scene: Opening",
      sceneId: "scene-1",
      sceneName: "Opening",
      duration: 8,
      backgroundAssetId: null,
      backgroundOptions: [{ assetId: "asset-bg-1", assetName: "Room", assetPath: "assets/backgrounds/room.png" }],
      fields: ["sceneName", "duration", "backgroundAssetId"],
    },
  }).render();

  return {
    view,
    onAddAsset: () => assetState(),
    onAddScene: () => sceneState(),
    onDeleteScene: () => sceneState(),
    onMoveScene: () => sceneState(),
    onPlay: async () => previewState(),
    onPause: () => previewState(),
    onSeek: async () => previewState(),
    onSelectAsset: () => assetState(),
    onSelectScene: () => sceneState(),
    onEditSceneName: () => inspectorState(),
    onEditSceneDuration: () => inspectorState(),
    onEditSceneBackground: () => inspectorState({ backgroundAssetId: "asset-bg-1" }),
  };
}

function assetState(): AssetLibraryState {
  return {
    assets: [{ assetId: "asset-bg-1", assetName: "Room", assetPath: "assets/backgrounds/room.png", assetType: "background" }],
    selectedAssetId: "asset-bg-1",
  };
}

function sceneState(): SceneFlowState {
  return { scenes: [], selectedSceneId: "scene-1" };
}

function inspectorState(overrides: { backgroundAssetId?: string | null } = {}): InspectorState {
  return {
    selection: { type: "scene", sceneId: "scene-1" },
    panel: {
      type: "scene",
      title: "Scene Inspector",
      selectedTargetLabel: "Scene: Opening",
      scene: {
        sceneId: "scene-1",
        sceneName: "Opening",
        duration: 8,
        backgroundAssetId: overrides.backgroundAssetId ?? null,
        characterIds: [],
        actions: [],
      },
      backgroundCandidates: [
        { assetId: "asset-bg-1", assetName: "Room", assetPath: "assets/backgrounds/room.png", assetType: "background" },
      ],
      editableFields: ["sceneName", "duration", "backgroundAssetId"],
    },
  };
}

function createPreviewUseCase(state: PreviewState = previewState()) {
  return {
    get state() {
      return state;
    },
    play: async () => state,
    pause: () => state,
    seek: async () => state,
  };
}

function previewState(): PreviewState {
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
