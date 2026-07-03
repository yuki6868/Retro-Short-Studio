import type { Project, ProjectSnapshot } from "../../../core/src";
import {
  PreviewSceneUseCase,
  PyxelPreviewEngineClient,
  type PreviewAudioController,
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

type PreviewRenderMode = "play" | "seek" | "advance";

export type PreviewControllerConfig = {
  getProject(): Project;
  getSelectedSceneId(): string | null;
  getTimeline(): TimelineUseCase;
  applyPreviewState(state: PreviewState): PreviewState;
  setTimelineState(state: TimelineState): void;
  syncPreviewCurrentTime?(input: { currentTime: number }): TimelineState;
  createInitialPreviewState(): PreviewState;
  audioController?: PreviewAudioController;
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
    this.config.audioController?.pause();
    const next = { ...this.latestState, playbackStatus: "paused" as const, error: null };
    this.latestState = next;
    return this.config.applyPreviewState(next);
  }

  async seek(time: number): Promise<PreviewState> {
    this.playbackSession += 1;
    return this.previewAt(time, this.latestState.playbackStatus, this.playbackSession, "seek");
  }

  async advancePlayingFrame(deltaSeconds: number, duration: number, playbackSession: number): Promise<PreviewState> {
    if (playbackSession !== this.playbackSession || this.latestState.playbackStatus !== "playing") {
      return this.latestState;
    }

    const nextTime = Math.min(duration, this.latestState.currentTime + deltaSeconds);
    const next = await this.previewAt(nextTime, nextTime >= duration ? "paused" : "playing", playbackSession, "advance");

    if (nextTime >= duration) {
      this.playbackSession += 1;
    }

    return next;
  }

  private async previewAt(
    time: number,
    playbackStatus: PreviewState["playbackStatus"],
    playbackSession: number,
    renderMode: PreviewRenderMode = playbackStatus === "playing" ? "play" : "seek",
  ): Promise<PreviewState> {
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
        defaultExpression: character.defaultExpression,
        defaultEye: character.defaultEye,
        defaultMouth: character.defaultMouth,
        defaultMotion: character.defaultMotion,
        imageMap: character.imageMap ?? { expression: {}, eye: {}, mouth: {}, motion: {} },
        imageMapId: character.imageMap === undefined ? null : character.characterId,
      })),
      engineClient: new PyxelPreviewEngineClient(),
      width: snapshot.settings.width,
      height: snapshot.settings.height,
      fps: snapshot.settings.fps,
      initialTime: time,
    };

    const useCase = this.config.createPreviewSceneUseCase?.(useCaseConfig) ?? new PreviewSceneUseCase(useCaseConfig);

    const next = renderMode === "play" ? await useCase.play() : await useCase.seek(time);

    if (playbackSession !== this.playbackSession) {
      return this.latestState;
    }

    const previous = this.latestState;
    const normalized = { ...next, playbackStatus };
    this.latestState = normalized;
    this.syncAudio(previous, normalized, renderMode);
    const timelineState =
      this.config.syncPreviewCurrentTime?.({ currentTime: normalized.currentTime }) ??
      this.config.getTimeline().setPlayhead({ time: normalized.currentTime });
    this.config.setTimelineState(timelineState);
    return this.config.applyPreviewState(normalized);
  }
  private syncAudio(previous: PreviewState, next: PreviewState, renderMode: PreviewRenderMode): void {
    const audioController = this.config.audioController;

    if (audioController === undefined) {
      return;
    }

    const nextVoicePath = next.voicePath ?? null;
    const previousVoicePath = previous.voicePath ?? null;
    const nextVoiceOffset = next.voiceOffset ?? 0;

    try {
      if (next.playbackStatus !== "playing") {
        if (renderMode === "advance" && next.currentTime >= (findSelectedSceneDto(this.config.getProject(), this.config.getSelectedSceneId())?.duration ?? 0)) {
          audioController.stop();
          return;
        }

        audioController.pause();
        return;
      }

      if (nextVoicePath === null) {
        if (previousVoicePath !== null || renderMode !== "advance") {
          audioController.stop();
        }
        return;
      }

      if (renderMode === "seek") {
        audioController.seek(nextVoiceOffset);
        void playAudioWithoutBlockingPreview(audioController, nextVoicePath, nextVoiceOffset);
        return;
      }

      if (renderMode === "play" || previousVoicePath !== nextVoicePath) {
        void playAudioWithoutBlockingPreview(audioController, nextVoicePath, nextVoiceOffset);
      }
    } catch {
      // Audio playback must never block or stop preview rendering.
      // Browsers may reject play() because of autoplay policy, missing files,
      // or a voice clip that is shorter than the Talk Action range.
    }
  }

}

async function playAudioWithoutBlockingPreview(
  audioController: PreviewAudioController,
  voicePath: string,
  voiceOffset: number,
): Promise<void> {
  try {
    await audioController.play(voicePath, voiceOffset);
  } catch {
    // Audio playback must never block or stop preview rendering.
    // Browsers may reject play() because of autoplay policy, missing files,
    // or a voice clip that is shorter than the Talk Action range.
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
    characters: scene.characters.map((character) => ({ ...character, transform: { ...character.transform } })),
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
