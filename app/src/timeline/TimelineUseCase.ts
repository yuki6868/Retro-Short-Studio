import type { ActionSnapshot, CharacterModelSnapshot, Project, SceneSnapshot } from "../../../core/src";
import type { ActionDto } from "../../../shared";

export type TimelineTrackId = string;

export type TimelineTrackKind = "character-instance" | "unassigned-character" | "effect" | "camera";

export type TimelineTrackDefinition = {
  trackId: TimelineTrackId;
  kind: TimelineTrackKind;
  label: string;
  purpose: string;
  acceptedActionTypes: string[];
  characterInstanceId: string | null;
  characterId: string | null;
  iconAssetId: string | null;
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

const UNASSIGNED_CHARACTER_TRACK: TimelineTrackDefinition = {
  trackId: "character:unassigned",
  kind: "unassigned-character",
  label: "Unassigned Character",
  purpose: "Character actions that do not have a CharacterInstance target yet.",
  acceptedActionTypes: ["talk", "move", "character_move", "character_pose", "character_expression", "expression", "motion"],
  characterInstanceId: null,
  characterId: null,
  iconAssetId: null,
};

const EFFECT_TRACK: TimelineTrackDefinition = {
  trackId: "effect",
  kind: "effect",
  label: "Effect",
  purpose: "Scene effects such as fade, flash, emphasis, and screen effects.",
  acceptedActionTypes: ["fade", "fade_in", "fade_out", "flash", "effect"],
  characterInstanceId: null,
  characterId: null,
  iconAssetId: null,
};

const CAMERA_TRACK: TimelineTrackDefinition = {
  trackId: "camera",
  kind: "camera",
  label: "Camera",
  purpose: "Camera actions such as zoom, pan, and camera movement.",
  acceptedActionTypes: ["camera_move", "camera_zoom", "camera_pan", "camera_shake"],
  characterInstanceId: null,
  characterId: null,
  iconAssetId: null,
};

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
      tracks: createTracks(scene, this.config.project.toSnapshot().characters, this.timeScale),
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
  return [createTrack(UNASSIGNED_CHARACTER_TRACK), createTrack(EFFECT_TRACK), createTrack(CAMERA_TRACK)];
}

function createTracks(scene: SceneSnapshot, characters: CharacterModelSnapshot[], timeScale: number): TimelineTrack[] {
  const characterNameById = new Map(characters.map((character) => [character.characterId, character.characterName]));
  const iconAssetByCharacterId = new Map(characters.map((character) => [character.characterId, character.imageMap?.expression?.[character.defaultExpression] ?? null]));
  const tracks: TimelineTrack[] = scene.characters.map((character) =>
    createTrack({
      trackId: createCharacterTrackId(character.instanceId),
      kind: "character-instance",
      label: characterNameById.get(character.characterId) ?? character.characterId,
      purpose: `Actions targeted at ${characterNameById.get(character.characterId) ?? character.characterId}.`,
      acceptedActionTypes: ["talk", "move", "character_move", "character_pose", "character_expression", "expression", "motion"],
      characterInstanceId: character.instanceId,
      characterId: character.characterId,
      iconAssetId: iconAssetByCharacterId.get(character.characterId) ?? null,
    }),
  );
  const unassignedTrack = createTrack(UNASSIGNED_CHARACTER_TRACK);
  const effectTrack = createTrack(EFFECT_TRACK);
  const cameraTrack = createTrack(CAMERA_TRACK);

  for (const action of scene.actions) {
    const track = resolveTrack(action, tracks, unassignedTrack, effectTrack, cameraTrack);
    track.items.push(toTimelineItem(scene.sceneId, action, timeScale));
  }

  const characterTracksWithActionsOrScenePresence = tracks.map(sortTrackItems);
  const tailTracks = [unassignedTrack, effectTrack, cameraTrack]
    .filter((track) => track.kind !== "unassigned-character" || track.items.length > 0)
    .map(sortTrackItems);

  return [...characterTracksWithActionsOrScenePresence, ...tailTracks];
}

function createTrack(definition: TimelineTrackDefinition): TimelineTrack {
  return {
    ...definition,
    acceptedActionTypes: [...definition.acceptedActionTypes],
    items: [],
  };
}

function sortTrackItems(track: TimelineTrack): TimelineTrack {
  return {
    ...track,
    items: [...track.items].sort((left, right) => left.startTime - right.startTime),
  };
}

function resolveTrack(
  action: ActionSnapshot,
  characterTracks: TimelineTrack[],
  unassignedTrack: TimelineTrack,
  effectTrack: TimelineTrack,
  cameraTrack: TimelineTrack,
): TimelineTrack {
  const actionTrackKind = resolveTrackKind(action.actionType);

  if (actionTrackKind === "effect") {
    return effectTrack;
  }

  if (actionTrackKind === "camera") {
    return cameraTrack;
  }

  if (action.targetId !== null) {
    return characterTracks.find((track) => track.characterInstanceId === action.targetId) ?? unassignedTrack;
  }

  return unassignedTrack;
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

function resolveTrackKind(actionType: string): TimelineTrackKind {
  const normalizedActionType = actionType.trim().toLowerCase();

  if (normalizedActionType === "talk") {
    return "unassigned-character";
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

  return "unassigned-character";
}

function createCharacterTrackId(instanceId: string): string {
  return `character:${instanceId}`;
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
