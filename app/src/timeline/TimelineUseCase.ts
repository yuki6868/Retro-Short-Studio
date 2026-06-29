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
  sceneId: string;
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
  minActionDuration?: number;
};

export type SetPlayheadInput = {
  time: number;
};

export type SetTimeScaleInput = {
  timeScale: number;
};

export type MoveTimelineItemInput = {
  sceneId: string;
  actionId: string;
  nextStartTime: number;
};

export type ResizeTimelineItemStartInput = {
  sceneId: string;
  actionId: string;
  nextStartTime: number;
};

export type ResizeTimelineItemEndInput = {
  sceneId: string;
  actionId: string;
  nextEndTime: number;
};

const DEFAULT_TIME_SCALE = 80;
const DEFAULT_MIN_ACTION_DURATION = 0.1;

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
  private readonly minActionDuration: number;

  constructor(private readonly config: TimelineUseCaseConfig) {
    this.selectedSceneId = config.initialSceneId ?? null;
    this.timeScale = normalizeTimeScale(config.initialTimeScale ?? DEFAULT_TIME_SCALE);
    this.minActionDuration = normalizeMinActionDuration(config.minActionDuration ?? DEFAULT_MIN_ACTION_DURATION);
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

  moveItem(input: MoveTimelineItemInput): TimelineState {
    const sceneId = normalizeSceneId(input.sceneId);
    const actionId = normalizeActionId(input.actionId);
    const scene = this.findSceneOrThrow(sceneId);
    const action = findActionOrThrow(scene, actionId);
    const duration = action.endTime - action.startTime;
    const nextStartTime = normalizeFiniteTime(input.nextStartTime, "Timeline nextStartTime");
    const nextEndTime = roundTimelineTime(nextStartTime + duration);

    this.updateActionTimeRange(scene, action, nextStartTime, nextEndTime);
    this.selectedSceneId = sceneId;
    return this.createState();
  }

  resizeItemStart(input: ResizeTimelineItemStartInput): TimelineState {
    const sceneId = normalizeSceneId(input.sceneId);
    const actionId = normalizeActionId(input.actionId);
    const scene = this.findSceneOrThrow(sceneId);
    const action = findActionOrThrow(scene, actionId);
    const nextStartTime = normalizeFiniteTime(input.nextStartTime, "Timeline nextStartTime");

    this.updateActionTimeRange(scene, action, nextStartTime, action.endTime);
    this.selectedSceneId = sceneId;
    return this.createState();
  }

  resizeItemEnd(input: ResizeTimelineItemEndInput): TimelineState {
    const sceneId = normalizeSceneId(input.sceneId);
    const actionId = normalizeActionId(input.actionId);
    const scene = this.findSceneOrThrow(sceneId);
    const action = findActionOrThrow(scene, actionId);
    const nextEndTime = normalizeFiniteTime(input.nextEndTime, "Timeline nextEndTime");

    this.updateActionTimeRange(scene, action, action.startTime, nextEndTime);
    this.selectedSceneId = sceneId;
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
      tracks: createTracks(scene, this.timeScale),
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

  private updateActionTimeRange(scene: SceneSnapshot, action: ActionSnapshot, startTime: number, endTime: number): void {
    validateActionTimeRange({
      actionId: action.actionId,
      sceneDuration: scene.duration,
      startTime,
      endTime,
      minActionDuration: this.minActionDuration,
    });

    this.config.project.updateScene(scene.sceneId, (editableScene) => {
      editableScene.updateAction(action.actionId, (editableAction) => editableAction.changeTimeRange(startTime, endTime));
    });
  }
}

function createEmptyTracks(): TimelineTrack[] {
  return ACTION_TIMELINE_TRACKS.map((track) => ({
    ...track,
    acceptedActionTypes: [...track.acceptedActionTypes],
    items: [],
  }));
}

function createTracks(scene: SceneSnapshot, timeScale: number): TimelineTrack[] {
  const tracks = createEmptyTracks();

  for (const action of scene.actions) {
    const trackId = resolveTrackId(action.actionType);
    const track = tracks.find((candidate) => candidate.trackId === trackId);

    if (track === undefined) {
      continue;
    }

    track.items.push(toTimelineItem(scene.sceneId, action, timeScale));
  }

  return tracks.map((track) => ({
    ...track,
    items: [...track.items].sort((left, right) => left.startTime - right.startTime),
  }));
}

function toTimelineItem(sceneId: string, action: ActionSnapshot, timeScale: number): TimelineItem {
  const duration = action.endTime - action.startTime;

  return {
    itemId: `timeline-item-${action.actionId}`,
    sceneId,
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

function normalizeActionId(actionId: string): string {
  const normalizedActionId = actionId.trim();

  if (normalizedActionId.length === 0) {
    throw new Error("Timeline actionId is required.");
  }

  return normalizedActionId;
}

function normalizeTimeScale(timeScale: number): number {
  if (!Number.isFinite(timeScale) || timeScale <= 0) {
    throw new Error("Timeline timeScale must be a positive number.");
  }

  return timeScale;
}

function normalizeMinActionDuration(minActionDuration: number): number {
  if (!Number.isFinite(minActionDuration) || minActionDuration <= 0) {
    throw new Error("Timeline minActionDuration must be a positive number.");
  }

  return minActionDuration;
}

function normalizeFiniteTime(time: number, label: string): number {
  if (!Number.isFinite(time)) {
    throw new Error(`${label} must be a finite number.`);
  }

  return roundTimelineTime(time);
}

function clampTime(time: number, duration: number): number {
  if (!Number.isFinite(time)) {
    throw new Error("Timeline playhead must be a finite number.");
  }

  return Math.min(Math.max(time, 0), duration);
}

function findActionOrThrow(scene: SceneSnapshot, actionId: string): ActionSnapshot {
  const action = scene.actions.find((candidate) => candidate.actionId === actionId);

  if (action === undefined) {
    throw new Error(`Timeline action does not exist: ${actionId}.`);
  }

  return action;
}

function validateActionTimeRange(input: {
  actionId: string;
  sceneDuration: number;
  startTime: number;
  endTime: number;
  minActionDuration: number;
}): void {
  if (input.startTime < 0) {
    throw new Error(`Timeline action cannot start before 0s: ${input.actionId}.`);
  }

  if (input.endTime > input.sceneDuration) {
    throw new Error(`Timeline action cannot end after the scene duration: ${input.actionId}.`);
  }

  if (input.endTime - input.startTime < input.minActionDuration) {
    throw new Error(`Timeline action duration is too short: ${input.actionId}.`);
  }
}

function roundTimelineTime(time: number): number {
  return Number(time.toFixed(6));
}
