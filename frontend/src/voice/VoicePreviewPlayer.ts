export type VoicePreviewPlayer = {
  play(path: string): Promise<void>;
  stop(): void;
};
