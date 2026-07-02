import type { PreviewPlaybackStatus } from "./PreviewState";

export type PreviewAudioState = {
  voicePath: string | null;
  offsetSeconds: number;
  playbackStatus: PreviewPlaybackStatus;
};

export interface PreviewAudioController {
  play(path: string, offsetSeconds: number): Promise<void>;
  pause(): void;
  stop(): void;
  seek(offsetSeconds: number): void;
}
