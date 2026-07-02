import type { AssetDto, CharacterDto, EngineClient, PreviewRequest, SceneDto } from "../../../shared";
import { PreviewClock } from "./PreviewClock";
import type { PreviewAudioController } from "./PreviewAudioController";
import type { PreviewPlaybackStatus, PreviewState } from "./PreviewState";

export type PreviewSceneUseCaseConfig = {
  projectId: string;
  scene: SceneDto;
  assets?: AssetDto[];
  characters?: CharacterDto[];
  engineClient: EngineClient;
  width: number;
  height: number;
  fps: number;
  initialTime?: number;
  audioController?: PreviewAudioController;
};

export class PreviewSceneUseCase {
  private readonly clock: PreviewClock;
  private playbackStatus: PreviewPlaybackStatus = "paused";
  private framePath: string | null = null;
  private error: string | null = null;
  private voicePath: string | null = null;
  private voiceOffset = 0;

  constructor(private readonly config: PreviewSceneUseCaseConfig) {
    validatePreviewConfig(config);
    this.clock = new PreviewClock(config.scene.duration, config.initialTime ?? 0);
  }

  get currentTime(): number {
    return this.clock.currentTime;
  }

  get state(): PreviewState {
    return this.createState();
  }

  async play(): Promise<PreviewState> {
    this.playbackStatus = "playing";
    return this.previewCurrentTime();
  }

  pause(): PreviewState {
    this.playbackStatus = "paused";
    this.error = null;
    this.config.audioController?.pause();
    return this.createState();
  }

  async seek(time: number): Promise<PreviewState> {
    this.clock.seek(time);
    return this.previewCurrentTime();
  }

  private async previewCurrentTime(): Promise<PreviewState> {
    this.error = null;

    try {
      const result = await this.config.engineClient.preview(this.createPreviewRequest());

      if (!result.ok || result.payload === null) {
        this.error = result.error ?? "Preview engine returned an empty result.";
        return this.createState();
      }

      this.clock.seek(result.payload.currentTime);
      this.framePath = result.payload.framePath;
      await this.syncAudioWithCurrentTime();
      return this.createState();
    } catch (error) {
      this.error = error instanceof Error ? error.message : "Preview engine failed.";
      return this.createState();
    }
  }

  private createPreviewRequest(): PreviewRequest {
    return {
      projectId: this.config.projectId,
      scene: this.config.scene,
      ...(this.config.assets === undefined ? {} : { assets: this.config.assets }),
      ...(this.config.characters === undefined ? {} : { characters: this.config.characters }),
      currentTime: this.clock.currentTime,
      width: this.config.width,
      height: this.config.height,
      fps: this.config.fps,
    };
  }

  private createState(): PreviewState {
    return {
      currentTime: this.clock.currentTime,
      playbackStatus: this.playbackStatus,
      framePath: this.framePath,
      width: this.config.width,
      height: this.config.height,
      fps: this.config.fps,
      error: this.error,
      voicePath: this.voicePath,
      voiceOffset: this.voiceOffset,
      audio: {
        voicePath: this.voicePath,
        offsetSeconds: this.voiceOffset,
        playbackStatus: this.playbackStatus,
      },
    };
  }

  private async syncAudioWithCurrentTime(): Promise<void> {
    const activeVoice = findActiveTalkVoice({
      scene: this.config.scene,
      assets: this.config.assets ?? [],
      currentTime: this.clock.currentTime,
    });

    this.voicePath = activeVoice?.voicePath ?? null;
    this.voiceOffset = activeVoice?.offsetSeconds ?? 0;

    if (activeVoice === null) {
      this.config.audioController?.stop();
      return;
    }

    if (this.playbackStatus !== "playing") {
      this.config.audioController?.seek(activeVoice.offsetSeconds);
      return;
    }

    await this.config.audioController?.play(activeVoice.voicePath, activeVoice.offsetSeconds);
  }
}

function validatePreviewConfig(config: PreviewSceneUseCaseConfig): void {
  if (config.projectId.trim().length === 0) {
    throw new Error("Preview projectId is required.");
  }

  if (!Number.isFinite(config.width) || config.width <= 0) {
    throw new Error("Preview width must be greater than 0.");
  }

  if (!Number.isFinite(config.height) || config.height <= 0) {
    throw new Error("Preview height must be greater than 0.");
  }

  if (!Number.isFinite(config.fps) || config.fps <= 0) {
    throw new Error("Preview fps must be greater than 0.");
  }
}


type ActiveTalkVoice = {
  voicePath: string;
  offsetSeconds: number;
};

function findActiveTalkVoice(input: { scene: SceneDto; assets: AssetDto[]; currentTime: number }): ActiveTalkVoice | null {
  for (const action of input.scene.actions) {
    if (action.actionType !== "talk") {
      continue;
    }

    if (input.currentTime < action.startTime || input.currentTime >= action.endTime) {
      continue;
    }

    const voicePath = resolveTalkVoicePath(action.payload, input.assets);

    if (voicePath === null) {
      continue;
    }

    return {
      voicePath,
      offsetSeconds: roundPreviewAudioOffset(input.currentTime - action.startTime),
    };
  }

  return null;
}

function resolveTalkVoicePath(payload: Record<string, unknown>, assets: AssetDto[]): string | null {
  const generatedVoicePath = readNonEmptyString(payload.generatedVoicePath);

  if (generatedVoicePath !== null) {
    return generatedVoicePath;
  }

  const voiceAssetPath = readNonEmptyString(payload.voiceAssetPath);

  if (voiceAssetPath !== null) {
    return voiceAssetPath;
  }

  const voiceAssetId = readNonEmptyString(payload.voiceAssetId);

  if (voiceAssetId === null) {
    return null;
  }

  return assets.find((asset) => asset.assetId === voiceAssetId && asset.assetType === "voice")?.assetPath ?? null;
}

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function roundPreviewAudioOffset(value: number): number {
  return Number(Math.max(0, value).toFixed(6));
}
