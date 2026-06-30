import type { AssetDto, CharacterDto, EngineClient, PreviewRequest, SceneDto } from "../../../shared";
import { PreviewClock } from "./PreviewClock";
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
};

export class PreviewSceneUseCase {
  private readonly clock: PreviewClock;
  private playbackStatus: PreviewPlaybackStatus = "paused";
  private framePath: string | null = null;
  private error: string | null = null;

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
    };
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
