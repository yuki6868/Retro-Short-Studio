import type { VoicePreviewPlayer } from "./VoicePreviewPlayer";

type VoiceAudioElement = {
  src: string;
  currentTime: number;
  play(): Promise<void>;
  pause(): void;
};

type VoiceAudioFactory = () => VoiceAudioElement;

export class HtmlVoicePreviewPlayer implements VoicePreviewPlayer {
  private audio: VoiceAudioElement | null;
  private readonly createAudio: VoiceAudioFactory;

  constructor(audio?: VoiceAudioElement, createAudio: VoiceAudioFactory = createBrowserAudio) {
    this.audio = audio ?? null;
    this.createAudio = createAudio;
  }

  async play(path: string): Promise<void> {
    const normalizedPath = path.trim();

    if (normalizedPath.length === 0) {
      throw new Error("Voice preview path is required.");
    }

    const audio = this.getAudio();
    audio.pause();
    audio.src = toPlayableVoiceUrl(normalizedPath);
    audio.currentTime = 0;
    await audio.play();
  }

  stop(): void {
    const audio = this.audio;

    if (audio === null) {
      return;
    }

    audio.pause();
    audio.currentTime = 0;
  }

  private getAudio(): VoiceAudioElement {
    if (this.audio === null) {
      this.audio = this.createAudio();
    }

    return this.audio;
  }
}

function createBrowserAudio(): VoiceAudioElement {
  if (typeof Audio === "undefined") {
    throw new Error("HTMLAudioElement is not available in this environment.");
  }

  return new Audio();
}


function toPlayableVoiceUrl(path: string): string {
  if (/^(https?:|blob:|data:)/u.test(path)) {
    return path;
  }

  const projectFilePath = path.startsWith("/") ? path.slice(1) : path;
  return `http://localhost:8000/api/project-files?path=${encodeURIComponent(projectFilePath)}`;
}
