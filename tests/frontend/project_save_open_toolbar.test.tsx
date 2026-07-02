import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { PreviewPanel, StudioLayout } from "../../frontend/src";
import { StudioWorkspace, type StudioWorkspaceProps } from "../../frontend/src/react/StudioWorkspace";
import type { PreviewState } from "../../app/src";

describe("Project save/open toolbar", () => {
  it("renders a named save control and a saved project picker", () => {
    const html = renderToStaticMarkup(
      <StudioWorkspace
        {...createWorkspaceProps({
          projectName: "Accounting Short",
          savedProjects: [
            { projectId: "project-1", projectName: "Accounting Short", updatedAt: "2026-07-02T00:00:00.000Z" },
            { projectId: "project-2", projectName: "Tax Short", updatedAt: "2026-07-01T00:00:00.000Z" },
          ],
          selectedSavedProjectId: "project-1",
        })}
      />,
    );

    expect(html).toContain('aria-label="Project controls"');
    expect(html).toContain('aria-label="Project name"');
    expect(html).toContain('value="Accounting Short"');
    expect(html).toContain(">Save Project</button>");
    expect(html).toContain(">Save As New Project</button>");
    expect(html).toContain('aria-label="Saved projects"');
    expect(html).toContain("Accounting Short");
    expect(html).toContain("Tax Short");
    expect(html).toContain(">Open Project</button>");
  });

  it("shows an empty saved-project picker state before the first save", () => {
    const html = renderToStaticMarkup(<StudioWorkspace {...createWorkspaceProps()} />);

    expect(html).toContain("No saved projects");
    expect(html).toContain("disabled");
  });

  it("shows project persistence status feedback from the controller", () => {
    const html = renderToStaticMarkup(
      <StudioWorkspace {...createWorkspaceProps({ projectPersistenceStatus: "Project saved: Local Preview" })} />,
    );

    expect(html).toContain("Project saved: Local Preview");
  });
});

function createWorkspaceProps(overrides: Partial<StudioWorkspaceProps> = {}): StudioWorkspaceProps {
  const preview = new PreviewPanel({ duration: 8, preview: createPreviewUseCase() }).render();
  const view = new StudioLayout({ preview }).render();

  return {
    view,
    onAddAsset: () => ({ title: "Asset Browser", assets: [], selectedAssetId: null, assetCount: 0, emptyText: "", addButton: { label: "Add Asset", disabled: false }, acceptedTypes: [] }),
    onAddScene: () => ({ title: "Scene Flow", scenes: [], selectedSceneId: null, sceneCount: 0, emptyText: "", addButton: { label: "Add Scene", disabled: false }, canReorder: false }),
    onDeleteScene: () => ({ title: "Scene Flow", scenes: [], selectedSceneId: null, sceneCount: 0, emptyText: "", addButton: { label: "Add Scene", disabled: false }, canReorder: false }),
    onMoveScene: () => ({ title: "Scene Flow", scenes: [], selectedSceneId: null, sceneCount: 0, emptyText: "", addButton: { label: "Add Scene", disabled: false }, canReorder: false }),
    onPlay: async () => initialPreviewState(),
    onPause: () => initialPreviewState(),
    onSeek: async () => initialPreviewState(),
    onSelectAsset: () => ({ title: "Asset Browser", assets: [], selectedAssetId: null, assetCount: 0, emptyText: "", addButton: { label: "Add Asset", disabled: false }, acceptedTypes: [] }),
    onSelectScene: () => ({ title: "Scene Flow", scenes: [], selectedSceneId: null, sceneCount: 0, emptyText: "", addButton: { label: "Add Scene", disabled: false }, canReorder: false }),
    onEditSceneName: () => emptyInspectorState(),
    onEditSceneDuration: () => emptyInspectorState(),
    projectName: "Local Preview",
    savedProjects: [],
    selectedSavedProjectId: null,
    onSaveProject: () => undefined,
    onSaveProjectAsNew: () => undefined,
    onOpenProject: () => undefined,
    ...overrides,
  };
}

function emptyInspectorState() {
  return {
    selection: { type: "none" as const },
    panel: {
      type: "empty" as const,
      title: "Inspector" as const,
      message: "Select a scene, character, or action to edit it.",
      selectedTargetLabel: "Nothing selected" as const,
    },
  };
}

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
