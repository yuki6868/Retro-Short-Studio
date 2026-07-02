import type { ActionSnapshot, Project } from "../../../core/src";
import type { InspectorState, InspectorUseCase } from "../inspector";
import type { TimelineState, TimelineUseCase } from "../timeline";

export type PreviewTimelineSyncUseCaseConfig = {
  project: Project;
  timeline: TimelineUseCase;
  inspector: InspectorUseCase;
};

export type PreviewTimelineSyncResult = {
  timelineState: TimelineState;
  inspectorState: InspectorState | null;
  activeActionId: string | null;
};

export type PreviewToTimelineInput = {
  sceneId: string | null;
  currentTime: number;
};

export type TimelineSeekInput = {
  sceneId: string | null;
  time: number;
};

export class PreviewTimelineSyncUseCase {
  private activeActionKey: string | null = null;

  constructor(private readonly config: PreviewTimelineSyncUseCaseConfig) {}

  syncPreviewCurrentTime(input: PreviewToTimelineInput): PreviewTimelineSyncResult {
    const timelineState = this.config.timeline.setPlayhead({ time: input.currentTime });
    const action = this.findActiveAction(input.sceneId, timelineState.playhead);
    const inspectorState = this.selectActionWhenChanged(input.sceneId, action);

    return {
      timelineState,
      inspectorState,
      activeActionId: action?.actionId ?? null,
    };
  }

  seekTimeline(input: TimelineSeekInput): PreviewTimelineSyncResult {
    const timelineState = this.config.timeline.setPlayhead({ time: input.time });
    const action = this.findActiveAction(input.sceneId, timelineState.playhead);
    const inspectorState = this.selectActionWhenChanged(input.sceneId, action);

    return {
      timelineState,
      inspectorState,
      activeActionId: action?.actionId ?? null,
    };
  }

  private selectActionWhenChanged(sceneId: string | null, action: ActionSnapshot | null): InspectorState | null {
    if (sceneId === null || action === null) {
      this.activeActionKey = null;
      return null;
    }

    const nextActionKey = `${sceneId}:${action.actionId}`;

    if (nextActionKey === this.activeActionKey) {
      return null;
    }

    this.activeActionKey = nextActionKey;
    return this.config.inspector.selectAction(sceneId, action.actionId);
  }

  private findActiveAction(sceneId: string | null, currentTime: number): ActionSnapshot | null {
    if (sceneId === null) {
      return null;
    }

    const scene = this.config.project.toSnapshot().scenes.find((candidate) => candidate.sceneId === sceneId);

    if (scene === undefined) {
      return null;
    }

    return scene.actions.find((action) => action.startTime <= currentTime && currentTime < action.endTime) ?? null;
  }
}
