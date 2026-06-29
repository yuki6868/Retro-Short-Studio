import type {
  SetPlayheadInput,
  SetTimeScaleInput,
  TimelineState,
  TimelineTrack,
  TimelineItem,
} from "../../../app/src";

export type TimelineTrackViewState = TimelineTrack & {
  itemCount: number;
};

export type TimelineItemViewState = TimelineItem & {
  label: string;
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
    itemCount: track.items.length,
    items: track.items.map(toItemViewState),
  };
}

function toItemViewState(item: TimelineItem): TimelineItemViewState {
  return {
    ...item,
    label: `${item.actionType} ${item.startTime.toFixed(1)}-${item.endTime.toFixed(1)}s`,
  };
}
