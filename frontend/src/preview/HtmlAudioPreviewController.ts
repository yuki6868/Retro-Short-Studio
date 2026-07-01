import type { PreviewAudioController } from "../../../app/src";

export class HtmlAudioPreviewController
    implements PreviewAudioController
{
    private readonly audio = new Audio();

    async play(path: string, offset: number): Promise<void> {
        this.audio.src = path;
        this.audio.currentTime = offset;
        await this.audio.play();
    }

    pause() {
        this.audio.pause();
    }

    stop() {
        this.audio.pause();
        this.audio.currentTime = 0;
    }

    seek(offset: number) {
        this.audio.currentTime = offset;
    }
}