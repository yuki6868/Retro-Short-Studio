export type PreviewPlaybackStatus = "paused" | "playing";

export type PreviewState = {
  currentTime: number;
  playbackStatus: PreviewPlaybackStatus;
  framePath: string | null;
  width: number;
  height: number;
  fps: number;
  error: string | null;
};
