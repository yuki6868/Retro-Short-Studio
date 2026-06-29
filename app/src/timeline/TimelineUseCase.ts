import type { ActionSnapshot, Project, SceneSnapshot } from "../../../core/src";
import type { ActionDto } from "../../../shared";

export type TimelineTrackId = "talk" | "character" | "effect" | "camera";

export type TimelineTrackDefinition = {
  trackId: TimelineTrackId;
  label: string;
  purpose: string;
  acceptedActionTypes: string[];
};

export type TimelineTrack = TimelineTrackDefinition & {
  items: TimelineItem[];
};

export type TimelineItem = {
  itemId: string;
  actionId: string;
  actionType: string;
  targetId: string | null;
  startTime: number;
  endTime: number;
  duration: number;
  left: number;
  width: number;
  payload: ActionDto["payload"];
};

export type TimelineState = {
  sceneId: string | null;
  sceneName: string | null;
  duration: number;
  timeScale: number;
  playhead: number;
  tracks: TimelineTrack[];
};

export type TimelineUseCaseConfig = {
  project: Project;
  initialSceneId?: string | null;
  initialTimeScale?: number;
};

export type SetPlayheadInput = {
  time: number;
};

export type SetTimeScaleInput = {
  timeScale: number;
};

const DEFAULT_TIME_SCALE = 80;

const ACTION_TIMELINE_TRACKS: readonly TimelineTrackDefinition[] = [
  {
    trackId: "talk",
    label: "Talk",
    purpose: "Talk actions that drive voice, subtitles, and lip-sync timing.",
    acceptedActionTypes: ["talk"],
  },
  {
    trackId: "character",
    label: "Character",
    purpose: "Character actions such as movement, pose, expression, and simple motion.",
    acceptedActionTypes: ["move", "character_move", "character_pose", "character_expression", "expression", "motion"],
  },
  {
    trackId: "effect",
    label: "Effect",
    purpose: "Scene effects such as fade, flash, emphasis, and screen effects.",
    acceptedActionTypes: ["fade", "fade_in", "fade_out", "flash", "effect"],
  },
  {
    trackId: "camera",
    label: "Camera",
    purpose: "Camera actions such as zoom, pan, and camera movement.",
    acceptedActionTypes: ["camera_move", "camera_zoom", "camera_pan", "camera_shake"],
  },
] as const;

export class TimelineUseCase {
  private selectedSceneId: string | null;
  private timeScale: number;
  private playhead = 0;

  constructor(private readonly config: TimelineUseCaseConfig) {
    this.selectedSceneId = config.initialSceneId ?? null;
    this.timeScale = normalizeTimeScale(config.initialTimeScale ?? DEFAULT_TIME_SCALE);
  }

  get state(): TimelineState {
    return this.createState();
  }

  showScene(sceneId: string | null): TimelineState {
    if (sceneId === null) {
      this.selectedSceneId = null;
      this.playhead = 0;
      return this.createState();
    }

    const normalizedSceneId = normalizeSceneId(sceneId);
    const scene = this.findSceneOrThrow(normalizedSceneId);
    this.selectedSceneId = normalizedSceneId;
    this.playhead = clampTime(this.playhead, scene.duration);
    return this.createState();
  }

  setPlayhead(input: SetPlayheadInput): TimelineState {
    const duration = this.currentScene()?.duration ?? 0;
    this.playhead = clampTime(input.time, duration);
    return this.createState();
  }

  setTimeScale(input: SetTimeScaleInput): TimelineState {
    this.timeScale = normalizeTimeScale(input.timeScale);
    return this.createState();
  }

  private createState(): TimelineState {
    const scene = this.currentScene();

    if (scene === null) {
      return {
        sceneId: null,
        sceneName: null,
        duration: 0,
        timeScale: this.timeScale,
        playhead: 0,
        tracks: createEmptyTracks(),
      };
    }

    return {
      sceneId: scene.sceneId,
      sceneName: scene.sceneName,
      duration: scene.duration,
      timeScale: this.timeScale,
      playhead: clampTime(this.playhead, scene.duration),
      tracks: createTracks(scene.actions, this.timeScale),
    };
  }

  private currentScene(): SceneSnapshot | null {
    if (this.selectedSceneId === null) {
      return null;
    }

    return this.findSceneOrThrow(this.selectedSceneId);
  }

  private findSceneOrThrow(sceneId: string): SceneSnapshot {
    const scene = this.config.project.toSnapshot().scenes.find((candidate) => candidate.sceneId === sceneId);

    if (scene === undefined) {
      throw new Error(`Timeline scene does not exist: ${sceneId}.`);
    }

    return scene;
  }
}

function createEmptyTracks(): TimelineTrack[] {
  return ACTION_TIMELINE_TRACKS.map((track) => ({
    ...track,
    acceptedActionTypes: [...track.acceptedActionTypes],
    items: [],
  }));
}

function createTracks(actions: ActionSnapshot[], timeScale: number): TimelineTrack[] {
  const tracks = createEmptyTracks();

  for (const action of actions) {
    const trackId = resolveTrackId(action.actionType);
    const track = tracks.find((candidate) => candidate.trackId === trackId);

    if (track === undefined) {
      continue;
    }

    track.items.push(toTimelineItem(action, timeScale));
  }

  return tracks.map((track) => ({
    ...track,
    items: [...track.items].sort((left, right) => left.startTime - right.startTime),
  }));
}

function toTimelineItem(action: ActionSnapshot, timeScale: number): TimelineItem {
  const duration = action.endTime - action.startTime;

  return {
    itemId: `timeline-item-${action.actionId}`,
    actionId: action.actionId,
    actionType: action.actionType,
    targetId: action.targetId,
    startTime: action.startTime,
    endTime: action.endTime,
    duration,
    left: action.startTime * timeScale,
    width: duration * timeScale,
    payload: action.payload,
  };
}

function resolveTrackId(actionType: string): TimelineTrackId {
  const normalizedActionType = actionType.trim().toLowerCase();

  if (normalizedActionType === "talk") {
    return "talk";
  }

  if (normalizedActionType.startsWith("camera_")) {
    return "camera";
  }

  if (
    normalizedActionType === "fade" ||
    normalizedActionType.startsWith("fade_") ||
    normalizedActionType === "flash" ||
    normalizedActionType.startsWith("effect_") ||
    normalizedActionType.includes("effect")
  ) {
    return "effect";
  }

  return "character";
}

function normalizeSceneId(sceneId: string): string {
  const normalizedSceneId = sceneId.trim();

  if (normalizedSceneId.length === 0) {
    throw new Error("Timeline sceneId is required.");
  }

  return normalizedSceneId;
}

function normalizeTimeScale(timeScale: number): number {
  if (!Number.isFinite(timeScale) || timeScale <= 0) {
    throw new Error("Timeline timeScale must be a positive number.");
  }

  return timeScale;
}

function clampTime(time: number, duration: number): number {
  if (!Number.isFinite(time)) {
    throw new Error("Timeline playhead must be a finite number.");
  }

  return Math.min(Math.max(time, 0), duration);
}
