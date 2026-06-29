import type { PreviewPanelViewState } from "../preview";

export type StudioRegionId = "assetBrowser" | "sceneFlow" | "preview" | "inspector" | "timeline";

export type StudioRegionState = {
  id: StudioRegionId;
  title: string;
  role: "asset" | "scene" | "preview" | "inspect" | "timeline";
  placeholderText: string;
};

export type AssetBrowserState = StudioRegionState & {
  id: "assetBrowser";
  role: "asset";
  assetCount: number;
};

export type SceneFlowState = StudioRegionState & {
  id: "sceneFlow";
  role: "scene";
  sceneCount: number;
};

export type InspectorState = StudioRegionState & {
  id: "inspector";
  role: "inspect";
  selectedTargetLabel: string;
};

export type TimelineState = StudioRegionState & {
  id: "timeline";
  role: "timeline";
  trackCount: number;
};

export type StudioPreviewRegionState = StudioRegionState & {
  id: "preview";
  role: "preview";
  preview: PreviewPanelViewState;
};

export type StudioLayoutViewState = {
  title: string;
  layout: {
    left: [AssetBrowserState, SceneFlowState];
    center: StudioPreviewRegionState;
    right: InspectorState;
    bottom: TimelineState;
  };
  order: StudioRegionId[];
};

export type StudioLayoutProps = {
  title?: string;
  preview: PreviewPanelViewState;
  assetCount?: number;
  sceneCount?: number;
  trackCount?: number;
  selectedTargetLabel?: string | null;
};

export class StudioLayout {
  constructor(private readonly props: StudioLayoutProps) {
    validateStudioLayoutProps(props);
  }

  render(): StudioLayoutViewState {
    return {
      title: this.props.title ?? "Retro Short Studio",
      layout: {
        left: [this.createAssetBrowser(), this.createSceneFlow()],
        center: this.createPreviewRegion(),
        right: this.createInspector(),
        bottom: this.createTimeline(),
      },
      order: ["assetBrowser", "sceneFlow", "preview", "inspector", "timeline"],
    };
  }

  private createAssetBrowser(): AssetBrowserState {
    return {
      id: "assetBrowser",
      title: "Asset Browser",
      role: "asset",
      placeholderText: "Assets will be listed here.",
      assetCount: this.props.assetCount ?? 0,
    };
  }

  private createSceneFlow(): SceneFlowState {
    return {
      id: "sceneFlow",
      title: "Scene Flow",
      role: "scene",
      placeholderText: "Scenes will be arranged here.",
      sceneCount: this.props.sceneCount ?? 0,
    };
  }

  private createPreviewRegion(): StudioPreviewRegionState {
    return {
      id: "preview",
      title: "Preview",
      role: "preview",
      placeholderText: "Scene preview is the center of the studio.",
      preview: this.props.preview,
    };
  }

  private createInspector(): InspectorState {
    return {
      id: "inspector",
      title: "Inspector",
      role: "inspect",
      placeholderText: "Select a scene, character, or action to edit it.",
      selectedTargetLabel: this.props.selectedTargetLabel ?? "Nothing selected",
    };
  }

  private createTimeline(): TimelineState {
    return {
      id: "timeline",
      title: "Timeline",
      role: "timeline",
      placeholderText: "Actions will be shown on timeline tracks.",
      trackCount: this.props.trackCount ?? 0,
    };
  }
}

function validateStudioLayoutProps(props: StudioLayoutProps): void {
  assertNonNegativeCount(props.assetCount, "assetCount");
  assertNonNegativeCount(props.sceneCount, "sceneCount");
  assertNonNegativeCount(props.trackCount, "trackCount");
}

function assertNonNegativeCount(value: number | undefined, name: string): void {
  if (value === undefined) {
    return;
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`StudioLayout ${name} must be a non-negative integer.`);
  }
}
