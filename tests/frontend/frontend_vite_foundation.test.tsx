import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import type { AddAssetInput, AddSceneInput, AssetLibraryState, InspectorState, MoveSceneInput, PreviewState, SceneFlowState } from "../../app/src";
import { PreviewPanel, StudioLayout } from "../../frontend/src";
import { StudioWorkspace } from "../../frontend/src/react";

describe("Frontend Vite foundation", () => {
  it("renders the studio layout as a browser entry component without engine access", () => {
    const view = new StudioLayout({
      preview: new PreviewPanel({ duration: 12, preview: createPreviewUseCase() }).render(),
    }).render();

    const html = renderToStaticMarkup(
      <StudioWorkspace
        view={view}
        onAddAsset={addAssetNoop}
        onAddScene={addSceneNoop}
        onDeleteScene={deleteSceneNoop}
        onMoveScene={moveSceneNoop}
        onPlay={async () => createPreviewState()}
        onPause={() => createPreviewState()}
        onSeek={async () => createPreviewState()}
        onSelectAsset={selectAssetNoop}
        onSelectScene={selectSceneNoop}
        onEditSceneName={editSceneNameNoop}
        onEditSceneDuration={editSceneDurationNoop}
      />,
    );

    expect(html).toContain("Retro Short Studio");
    expect(html).toContain("Asset Browser");
    expect(html).toContain("Scene Flow");
    expect(html).toContain("Preview");
    expect(html).toContain("Inspector");
    expect(html).toContain("Timeline");
    expect(html).toContain("Preview frame will appear here.");
    expect(html).not.toContain("PyxelRenderer");
    expect(html).not.toContain("VOICEVOX");
  });

  it("keeps preview controls visible in the browser shell", () => {
    const view = new StudioLayout({
      preview: new PreviewPanel({ duration: 20, preview: createPreviewUseCase() }).render(),
    }).render();

    const html = renderToStaticMarkup(
      <StudioWorkspace
        view={view}
        onAddAsset={addAssetNoop}
        onAddScene={addSceneNoop}
        onDeleteScene={deleteSceneNoop}
        onMoveScene={moveSceneNoop}
        onPlay={async () => createPreviewState()}
        onPause={() => createPreviewState()}
        onSeek={async () => createPreviewState()}
        onSelectAsset={selectAssetNoop}
        onSelectScene={selectSceneNoop}
        onEditSceneName={editSceneNameNoop}
        onEditSceneDuration={editSceneDurationNoop}
      />,
    );

    expect(html).toContain("Play");
    expect(html).toContain("Pause");
    expect(html).toContain("Seek");
    expect(html).toContain("type=\"range\"");
    expect(html).toContain("0.0s");
  });
});

function createPreviewUseCase(state: PreviewState = createPreviewState()) {
  return {
    get state() {
      return state;
    },
    play: async () => state,
    pause: () => state,
    seek: async () => state,
  };
}

function createPreviewState(): PreviewState {
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

function addAssetNoop(_input: AddAssetInput): AssetLibraryState {
  return { assets: [], selectedAssetId: null };
}

function selectAssetNoop(_assetId: string): AssetLibraryState {
  return { assets: [], selectedAssetId: null };
}


function addSceneNoop(_input: AddSceneInput): SceneFlowState {
  return { scenes: [], selectedSceneId: null };
}

function deleteSceneNoop(_sceneId: string): SceneFlowState {
  return { scenes: [], selectedSceneId: null };
}

function moveSceneNoop(_input: MoveSceneInput): SceneFlowState {
  return { scenes: [], selectedSceneId: null };
}

function selectSceneNoop(_sceneId: string): SceneFlowState {
  return { scenes: [], selectedSceneId: null };
}

function editSceneNameNoop(_sceneId: string, _sceneName: string): InspectorState {
  return emptyInspectorState();
}

function editSceneDurationNoop(_sceneId: string, _duration: number): InspectorState {
  return emptyInspectorState();
}

function emptyInspectorState(): InspectorState {
  return {
    selection: { type: "none" },
    panel: {
      type: "empty",
      title: "Inspector",
      message: "Select a scene, character, or action to edit it.",
      selectedTargetLabel: "Nothing selected",
    },
  };
}
