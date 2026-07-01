import type { Project, ProjectSnapshot } from "../../../core/src";
import {
  PreviewSceneUseCase,
  PyxelPreviewEngineClient,
  type PreviewSceneUseCaseConfig,
  type PreviewState,
  type TimelineState,
  type TimelineUseCase,
} from "../../../app/src";
import type { ActionDto, AssetDto, SceneDto } from "../../../shared";

export type PreviewSceneUseCaseLike = {
  play(): Promise<PreviewState>;
  seek(time: number): Promise<PreviewState>;
};

export type PreviewControllerConfig = {
  getProject(): Project;
  getSelectedSceneId(): string | null;
  getTimeline(): TimelineUseCase;
  applyPreviewState(state: PreviewState): PreviewState;
  setTimelineState(state: TimelineState): void;
  createInitialPreviewState(): PreviewState;
  createPreviewSceneUseCase?(config: PreviewSceneUseCaseConfig): PreviewSceneUseCaseLike;
};

export class PreviewController {
  private latestState: PreviewState;
  private playbackSession = 0;

  constructor(private readonly config: PreviewControllerConfig) {
    this.latestState = config.createInitialPreviewState();
  }

  get currentPlaybackSession(): number {
    return this.playbackSession;
  }

  setLatestState(state: PreviewState): void {
    this.latestState = state;
  }

  async play(currentTime: number): Promise<PreviewState> {
    this.playbackSession += 1;
    return this.previewAt(currentTime, "playing", this.playbackSession);
  }

  pause(): PreviewState {
    this.playbackSession += 1;
    const next = { ...this.latestState, playbackStatus: "paused" as const, error: null };
    return this.config.applyPreviewState(next);
  }

  async seek(time: number): Promise<PreviewState> {
    this.playbackSession += 1;
    return this.previewAt(time, this.latestState.playbackStatus, this.playbackSession);
  }

  async advancePlayingFrame(deltaSeconds: number, duration: number, playbackSession: number): Promise<PreviewState> {
    if (playbackSession !== this.playbackSession || this.latestState.playbackStatus !== "playing") {
      return this.latestState;
    }

    const nextTime = Math.min(duration, this.latestState.currentTime + deltaSeconds);
    const next = await this.previewAt(nextTime, nextTime >= duration ? "paused" : "playing", playbackSession);

    if (nextTime >= duration) {
      this.playbackSession += 1;
    }

    return next;
  }

  private async previewAt(time: number, playbackStatus: PreviewState["playbackStatus"], playbackSession: number): Promise<PreviewState> {
    const project = this.config.getProject();
    const snapshot = project.toSnapshot();
    const selectedScene = findSelectedSceneDto(project, this.config.getSelectedSceneId());

    if (selectedScene === null) {
      const next = {
        ...this.config.createInitialPreviewState(),
        playbackStatus: "paused" as const,
        error: "Select a scene before previewing.",
      };
      return this.config.applyPreviewState(next);
    }

    const useCaseConfig: PreviewSceneUseCaseConfig = {
      projectId: snapshot.projectId,
      scene: selectedScene,
      assets: snapshot.assets.map(toAssetDto),
      characters: snapshot.characters.map((character) => ({
        characterId: character.characterId,
        characterName: character.characterName,
        imageMapId: character.imageMap === undefined ? null : character.characterId,
      })),
      engineClient: new PyxelPreviewEngineClient(),
      width: snapshot.settings.width,
      height: snapshot.settings.height,
      fps: snapshot.settings.fps,
      initialTime: time,
    };

    const useCase = this.config.createPreviewSceneUseCase?.(useCaseConfig) ?? new PreviewSceneUseCase(useCaseConfig);

    const next = playbackStatus === "playing" ? await useCase.play() : await useCase.seek(time);

    if (playbackSession !== this.playbackSession) {
      return this.latestState;
    }

    const normalized = { ...next, playbackStatus };
    this.config.setTimelineState(this.config.getTimeline().setPlayhead({ time: normalized.currentTime }));
    return this.config.applyPreviewState(normalized);
  }
}

export function findSelectedSceneDto(project: Project, selectedSceneId: string | null): SceneDto | null {
  const snapshot = project.toSnapshot();
  const scene = findScene(snapshot, selectedSceneId);

  if (scene === null) {
    return null;
  }

  return {
    sceneId: scene.sceneId,
    sceneName: scene.sceneName,
    duration: scene.duration,
    backgroundAssetId: scene.backgroundAssetId,
    characterIds: scene.characters.map((character) => character.characterId),
    actions: scene.actions.map(toActionDto),
  };
}

function findScene(snapshot: ProjectSnapshot, selectedSceneId: string | null): ProjectSnapshot["scenes"][number] | null {
  if (selectedSceneId !== null) {
    return snapshot.scenes.find((scene) => scene.sceneId === selectedSceneId) ?? null;
  }

  return snapshot.scenes[0] ?? null;
}

function toAssetDto(asset: ProjectSnapshot["assets"][number]): AssetDto {
  return {
    assetId: asset.assetId,
    assetName: asset.assetName,
    assetType: asset.assetType as AssetDto["assetType"],
    assetPath: asset.assetPath,
  };
}

function toActionDto(action: ProjectSnapshot["scenes"][number]["actions"][number]): ActionDto {
  return {
    actionId: action.actionId,
    actionType: action.actionType as ActionDto["actionType"],
    startTime: action.startTime,
    endTime: action.endTime,
    targetId: action.targetId,
    payload: action.payload,
  };
}
