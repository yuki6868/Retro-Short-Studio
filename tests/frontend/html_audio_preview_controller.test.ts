import { describe, expect, it } from "vitest";

import { HtmlAudioPreviewController } from "../../frontend/src";

describe("HtmlAudioPreviewController", () => {
  it("does not create HTML Audio until playback is requested", () => {
    let createCount = 0;

    const controller = new HtmlAudioPreviewController(() => {
      createCount += 1;
      return createFakeAudio();
    });

    controller.pause();
    controller.stop();
    controller.seek(1);

    expect(createCount).toBe(0);
  });

  it("keeps same Talk Action audio running without resetting currentTime every frame", async () => {
    const audio = createFakeAudio();
    const controller = new HtmlAudioPreviewController(() => audio);

    await controller.play("projects/voices/talk-1.wav", 1);
    audio.currentTime = 1.08;
    await controller.play("projects/voices/talk-1.wav", 1.1);

    expect(audio.src).toBe("projects/voices/talk-1.wav");
    expect(audio.currentTime).toBe(1.08);
    expect(audio.playCallCount).toBe(1);
  });

  it("does not resync already-playing audio from frame preview calls", async () => {
    const audio = createFakeAudio();
    const controller = new HtmlAudioPreviewController(() => audio);

    await controller.play("projects/voices/talk-1.wav", 1);
    audio.currentTime = 1.05;
    await controller.play("projects/voices/talk-1.wav", 2);

    expect(audio.currentTime).toBe(1.05);
    expect(audio.playCallCount).toBe(1);
  });

  it("resyncs the same audio only through an explicit seek", async () => {
    const audio = createFakeAudio();
    const controller = new HtmlAudioPreviewController(() => audio);

    await controller.play("projects/voices/talk-1.wav", 1);
    audio.currentTime = 1.05;
    controller.seek(2);
    await controller.play("projects/voices/talk-1.wav", 2);

    expect(audio.currentTime).toBe(2);
    expect(audio.playCallCount).toBe(1);
  });

  it("switches source and restarts when active Talk Action voice changes", async () => {
    const audio = createFakeAudio();
    const controller = new HtmlAudioPreviewController(() => audio);

    await controller.play("projects/voices/talk-1.wav", 0.4);
    await controller.play("projects/voices/talk-2.wav", 0.2);

    expect(audio.src).toBe("projects/voices/talk-2.wav");
    expect(audio.currentTime).toBe(0.2);
    expect(audio.playCallCount).toBe(2);
  });
});

type FakeAudio = {
  src: string;
  currentTime: number;
  paused: boolean;
  playCallCount: number;
  pauseCallCount: number;
  play(): Promise<void>;
  pause(): void;
};

function createFakeAudio(): FakeAudio {
  return {
    src: "",
    currentTime: 0,
    paused: true,
    playCallCount: 0,
    pauseCallCount: 0,
    async play(): Promise<void> {
      this.playCallCount += 1;
      this.paused = false;
    },
    pause(): void {
      this.pauseCallCount += 1;
      this.paused = true;
    },
  };
}
