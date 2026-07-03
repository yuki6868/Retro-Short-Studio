import type { PreviewState } from "../../../app/src";
import { PauseButton, PlayButton, SeekControl, type ButtonState, type SeekControlState } from "./PreviewControls";

export type PreviewPanelUseCase = {
  readonly state: PreviewState;
  play(): Promise<PreviewState>;
  pause(): PreviewState;
  seek(time: number): Promise<PreviewState>;
};

export type PreviewPanelProps = {
  title?: string;
  duration: number;
  preview: PreviewPanelUseCase;
};

export type PreviewSurfaceState = {
  width: number;
  height: number;
  framePath: string | null;
  placeholderText: string;
};

export type PreviewPanelViewState = {
  title: string;
  currentTime: number;
  duration: number;
  playbackStatus: PreviewState["playbackStatus"];
  surface: PreviewSurfaceState;
  playButton: ButtonState;
  pauseButton: ButtonState;
  seekControl: SeekControlState;
  error: string | null;
};

export class PreviewPanel {
  private latestState: PreviewState;

  constructor(private readonly props: PreviewPanelProps) {
    validatePreviewPanelProps(props);
    this.latestState = props.preview.state;
  }

  render(): PreviewPanelViewState {
    return this.createViewState(this.latestState);
  }

  async clickPlay(): Promise<PreviewPanelViewState> {
    this.latestState = await this.props.preview.play();
    return this.render();
  }

  clickPause(): PreviewPanelViewState {
    this.latestState = this.props.preview.pause();
    return this.render();
  }

  async changeSeek(time: number): Promise<PreviewPanelViewState> {
    if (!Number.isFinite(time)) {
      throw new Error("Preview seek time must be a finite number.");
    }

    this.latestState = await this.props.preview.seek(time);
    return this.render();
  }

  private createViewState(state: PreviewState): PreviewPanelViewState {
    const isPlaying = state.playbackStatus === "playing";
    const isBusy = false;
    const seekStep = createPreviewSeekControlStep(state.fps);
    const seekDisplayTime = roundPreviewTimeForSeekControl(state.currentTime, state.fps, this.props.duration);

    return {
      title: this.props.title ?? "Preview",
      currentTime: state.currentTime,
      duration: this.props.duration,
      playbackStatus: state.playbackStatus,
      surface: {
        width: state.width,
        height: state.height,
        framePath: state.framePath,
        placeholderText: state.framePath === null ? "Preview frame will appear here." : "",
      },
      playButton: new PlayButton(isPlaying || isBusy).state,
      pauseButton: new PauseButton(!isPlaying || isBusy).state,
      seekControl: new SeekControl(seekDisplayTime, this.props.duration, seekStep, isBusy).state,
      error: state.error,
    };
  }
}

export function createPreviewSeekControlStep(fps: number): number {
  if (!Number.isFinite(fps) || fps <= 0) {
    return 1 / 30;
  }

  return 1 / fps;
}

export function roundPreviewTimeForSeekControl(currentTime: number, fps: number, duration: number): number {
  if (!Number.isFinite(currentTime)) {
    throw new Error("Preview seek display time must be a finite number.");
  }

  if (!Number.isFinite(duration) || duration < 0) {
    throw new Error("Preview seek display duration must be greater than or equal to 0.");
  }

  if (!Number.isFinite(fps) || fps <= 0) {
    return clampPreviewTime(currentTime, duration);
  }

  return clampPreviewTime(Math.round(currentTime * fps) / fps, duration);
}

function clampPreviewTime(time: number, duration: number): number {
  return Math.min(duration, Math.max(0, time));
}

function validatePreviewPanelProps(props: PreviewPanelProps): void {
  if (!Number.isFinite(props.duration) || props.duration < 0) {
    throw new Error("PreviewPanel duration must be greater than or equal to 0.");
  }
}
