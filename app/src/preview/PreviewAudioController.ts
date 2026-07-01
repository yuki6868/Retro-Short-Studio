export interface PreviewAudioController {
    play(path: string, offsetSeconds: number): Promise<void>;
    pause(): void;
    stop(): void;
    seek(offsetSeconds: number): void;
}