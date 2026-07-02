import type { PreviewAudioController } from "../../../app/src";

type AudioElementLike = {
  src: string;
  currentTime: number;
  paused: boolean;
  play(): Promise<void>;
  pause(): void;
};

type AudioFactory = () => AudioElementLike;

export class HtmlAudioPreviewController implements PreviewAudioController {
  private readonly createAudio: AudioFactory;
  private audio: AudioElementLike | null = null;
  private activePath: string | null = null;

  constructor(createAudio: AudioFactory = createBrowserAudioElement) {
    this.createAudio = createAudio;
  }

  async play(path: string, offset: number): Promise<void> {
    const audio = this.getAudio();
    const normalizedOffset = normalizeOffset(offset);
    const pathChanged = this.activePath !== path;

    if (pathChanged) {
      audio.src = path;
      this.activePath = path;
      audio.currentTime = normalizedOffset;
    }

    if (!pathChanged && !audio.paused) {
      return;
    }

    if (!pathChanged) {
      audio.currentTime = normalizedOffset;
    }

    await audio.play();
  }

  pause(): void {
    this.audio?.pause();
  }

  stop(): void {
    if (this.audio === null) {
      return;
    }

    this.audio.pause();
    this.audio.currentTime = 0;
    this.activePath = null;
  }

  seek(offset: number): void {
    if (this.audio === null) {
      return;
    }

    this.audio.currentTime = normalizeOffset(offset);
  }

  private getAudio(): AudioElementLike {
    if (this.audio === null) {
      this.audio = this.createAudio();
    }

    return this.audio;
  }
}

function createBrowserAudioElement(): AudioElementLike {
  if (typeof Audio === "undefined") {
    throw new Error("HTML Audio is not available in this runtime.");
  }

  return new Audio();
}

function normalizeOffset(offset: number): number {
  return Number.isFinite(offset) ? Math.max(0, offset) : 0;
}
