import type { AssetBrowserViewState } from "../asset";
import type { PreviewPanelViewState } from "../preview";
import type { SceneFlowViewState } from "../scene";
import type { InspectorViewState } from "../inspector";
import type { TimelineViewState } from "../timeline";

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
  assetBrowser: AssetBrowserViewState | null;
};

export type StudioSceneFlowState = StudioRegionState & {
  id: "sceneFlow";
  role: "scene";
  sceneCount: number;
  sceneFlow: SceneFlowViewState | null;
};

export type InspectorRegionState = StudioRegionState & {
  id: "inspector";
  role: "inspect";
  selectedTargetLabel: string;
  inspector: InspectorViewState | null;
};

export type StudioTimelineState = StudioRegionState & {
  id: "timeline";
  role: "timeline";
  trackCount: number;
  timeline: TimelineViewState | null;
};

export type StudioPreviewRegionState = StudioRegionState & {
  id: "preview";
  role: "preview";
  preview: PreviewPanelViewState;
};

export type StudioLayoutViewState = {
  title: string;
  layout: {
    left: [AssetBrowserState, StudioSceneFlowState];
    center: StudioPreviewRegionState;
    right: InspectorRegionState;
    bottom: StudioTimelineState;
  };
  order: StudioRegionId[];
};

export type StudioLayoutProps = {
  title?: string;
  preview: PreviewPanelViewState;
  assetBrowser?: AssetBrowserViewState;
  sceneFlow?: SceneFlowViewState;
  assetCount?: number;
  sceneCount?: number;
  trackCount?: number;
  selectedTargetLabel?: string | null;
  inspector?: InspectorViewState;
  timeline?: TimelineViewState;
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
      placeholderText: this.props.assetBrowser === undefined ? "Assets will be listed here." : this.props.assetBrowser.emptyText,
      assetCount: this.props.assetBrowser?.assetCount ?? this.props.assetCount ?? 0,
      assetBrowser: this.props.assetBrowser ?? null,
    };
  }

  private createSceneFlow(): StudioSceneFlowState {
    return {
      id: "sceneFlow",
      title: "Scene Flow",
      role: "scene",
      placeholderText: this.props.sceneFlow === undefined ? "Scenes will be arranged here." : this.props.sceneFlow.emptyText,
      sceneCount: this.props.sceneFlow?.sceneCount ?? this.props.sceneCount ?? 0,
      sceneFlow: this.props.sceneFlow ?? null,
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

  private createInspector(): InspectorRegionState {
    const inspector = this.props.inspector ?? null;

    return {
      id: "inspector",
      title: inspector?.title ?? "Inspector",
      role: "inspect",
      placeholderText: inspector?.type === "empty" || inspector === null
        ? "Select a scene, character, or action to edit it."
        : "",
      selectedTargetLabel: inspector?.selectedTargetLabel ?? this.props.selectedTargetLabel ?? "Nothing selected",
      inspector,
    };
  }

  private createTimeline(): StudioTimelineState {
    const timeline = this.props.timeline ?? null;

    return {
      id: "timeline",
      title: "Timeline",
      role: "timeline",
      placeholderText: timeline === null ? "Actions will be shown on timeline tracks." : timeline.emptyText,
      trackCount: timeline?.trackCount ?? this.props.trackCount ?? 0,
      timeline,
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
