import { describe, expect, it } from "vitest";

import { HtmlVoicePreviewPlayer } from "../../frontend/src";

describe("HtmlVoicePreviewPlayer", () => {
  it("plays generated TalkAction voice through an HTML audio boundary", async () => {
    const audio = new FakeAudio();
    const player = new HtmlVoicePreviewPlayer(audio);

    await player.play(" voices/line001.wav ");

    expect(audio.src).toBe("http://localhost:8000/api/project-files?path=voices%2Fline001.wav");
    expect(audio.currentTime).toBe(0);
    expect(audio.playCalls).toBe(1);
  });



  it("keeps browser-playable URLs as-is", async () => {
    const audio = new FakeAudio();
    const player = new HtmlVoicePreviewPlayer(audio);

    await player.play("http://localhost:8000/api/project-files?path=voices%2Fline001.wav");

    expect(audio.src).toBe("http://localhost:8000/api/project-files?path=voices%2Fline001.wav");
    expect(audio.playCalls).toBe(1);
  });

  it("stops generated TalkAction voice without touching Preview playback", () => {
    const audio = new FakeAudio();
    audio.currentTime = 1.2;
    const player = new HtmlVoicePreviewPlayer(audio);

    player.stop();

    expect(audio.pauseCalls).toBe(1);
    expect(audio.currentTime).toBe(0);
  });

  it("rejects empty preview paths before calling HTMLAudioElement.play", async () => {
    const audio = new FakeAudio();
    const player = new HtmlVoicePreviewPlayer(audio);

    await expect(player.play("   ")).rejects.toThrow("Voice preview path is required.");
    expect(audio.playCalls).toBe(0);
  });
});

class FakeAudio {
  src = "";
  currentTime = 0;
  playCalls = 0;
  pauseCalls = 0;

  async play(): Promise<void> {
    this.playCalls += 1;
  }

  pause(): void {
    this.pauseCalls += 1;
  }
}
