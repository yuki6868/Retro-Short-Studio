import type {
  MoveTimelineItemInput,
  ResizeTimelineItemEndInput,
  ResizeTimelineItemStartInput,
  SetPlayheadInput,
  SetTimeScaleInput,
  TimelineState,
  TimelineTrack,
  TimelineItem,
} from "../../../app/src";

export type TimelineTrackViewState = TimelineTrack & {
  itemCount: number;
  emptyText: string;
};

export type TimelineItemViewState = TimelineItem & {
  label: string;
  summary: string;
};

export type TimelineViewState = {
  title: "Timeline";
  emptyText: string;
  sceneId: string | null;
  sceneName: string | null;
  duration: number;
  timeScale: number;
  playhead: number;
  playheadLeft: number;
  trackCount: number;
  tracks: Array<Omit<TimelineTrackViewState, "items"> & { items: TimelineItemViewState[] }>;
};

export type TimelineUseCase = {
  readonly state: TimelineState;
  showScene(sceneId: string | null): TimelineState;
  setPlayhead(input: SetPlayheadInput): TimelineState;
  setTimeScale(input: SetTimeScaleInput): TimelineState;
  moveItem(input: MoveTimelineItemInput): TimelineState;
  resizeItemStart(input: ResizeTimelineItemStartInput): TimelineState;
  resizeItemEnd(input: ResizeTimelineItemEndInput): TimelineState;
};

export type TimelineProps = {
  timeline: TimelineUseCase;
};

export class Timeline {
  constructor(private readonly props: TimelineProps) {}

  render(): TimelineViewState {
    return toViewState(this.props.timeline.state);
  }

  showScene(sceneId: string | null): TimelineViewState {
    return toViewState(this.props.timeline.showScene(sceneId));
  }

  setPlayhead(time: number): TimelineViewState {
    return toViewState(this.props.timeline.setPlayhead({ time }));
  }

  setTimeScale(timeScale: number): TimelineViewState {
    return toViewState(this.props.timeline.setTimeScale({ timeScale }));
  }

  moveItem(input: MoveTimelineItemInput): TimelineViewState {
    return toViewState(this.props.timeline.moveItem(input));
  }

  resizeItemStart(input: ResizeTimelineItemStartInput): TimelineViewState {
    return toViewState(this.props.timeline.resizeItemStart(input));
  }

  resizeItemEnd(input: ResizeTimelineItemEndInput): TimelineViewState {
    return toViewState(this.props.timeline.resizeItemEnd(input));
  }
}

function toViewState(state: TimelineState): TimelineViewState {
  return {
    title: "Timeline",
    emptyText: state.sceneId === null ? "Select a scene to show its actions on the timeline." : "No actions in this scene yet.",
    sceneId: state.sceneId,
    sceneName: state.sceneName,
    duration: state.duration,
    timeScale: state.timeScale,
    playhead: state.playhead,
    playheadLeft: state.playhead * state.timeScale,
    trackCount: state.tracks.length,
    tracks: state.tracks.map(toTrackViewState),
  };
}

function toTrackViewState(track: TimelineTrack): TimelineViewState["tracks"][number] {
  return {
    trackId: track.trackId,
    label: track.label,
    purpose: track.purpose,
    acceptedActionTypes: track.acceptedActionTypes,
    itemCount: track.items.length,
    emptyText: `${track.label} actions will appear here.`,
    items: track.items.map((item) => toItemViewState(track, item)),
  };
}

function toItemViewState(track: TimelineTrack, item: TimelineItem): TimelineItemViewState {
  return {
    ...item,
    label: `${track.label}: ${formatActionType(item.actionType)} ${item.startTime.toFixed(1)}-${item.endTime.toFixed(1)}s`,
    summary: createItemSummary(track, item),
  };
}

function createItemSummary(track: TimelineTrack, item: TimelineItem): string {
  const targetLabel = item.targetId === null ? "no target" : item.targetId;
  return `${track.label} track item for ${targetLabel}`;
}

function formatActionType(actionType: string): string {
  return actionType
    .split("_")
    .filter((part) => part.length > 0)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
