import { describe, expect, it } from "vitest";

import { PreviewPanel, createPreviewSeekControlStep, roundPreviewTimeForSeekControl, type PreviewPanelUseCase } from "../../frontend/src";
import type { PreviewState } from "../../app/src";

describe("PreviewPanel", () => {
  it("renders a central preview surface with playback controls before a frame exists", () => {
    const panel = new PreviewPanel({
      title: "Scene Preview",
      duration: 8,
      preview: createPreviewUseCase(initialState()),
    });

    const view = panel.render();

    expect(view.title).toBe("Scene Preview");
    expect(view.surface).toEqual({
      width: 1280,
      height: 720,
      framePath: null,
      placeholderText: "Preview frame will appear here.",
    });
    expect(view.playButton).toEqual({ label: "Play", disabled: false });
    expect(view.pauseButton).toEqual({ label: "Pause", disabled: true });
    expect(view.seekControl).toEqual({ label: "Seek", value: 0, min: 0, max: 8, step: 1 / 30, disabled: false });
  });

  it("delegates play to the preview use case and updates the panel state", async () => {
    const calls: string[] = [];
    const panel = new PreviewPanel({
      duration: 8,
      preview: createPreviewUseCase(initialState(), {
        play: async () => {
          calls.push("play");
          return {
            ...initialState(),
            playbackStatus: "playing",
            framePath: "renders/preview-0000.png",
          };
        },
      }),
    });

    const view = await panel.clickPlay();

    expect(calls).toEqual(["play"]);
    expect(view.playbackStatus).toBe("playing");
    expect(view.surface.framePath).toBe("renders/preview-0000.png");
    expect(view.playButton.disabled).toBe(true);
    expect(view.pauseButton.disabled).toBe(false);
  });

  it("delegates pause to the preview use case without touching engine details", () => {
    const calls: string[] = [];
    const panel = new PreviewPanel({
      duration: 8,
      preview: createPreviewUseCase(
        {
          ...initialState(),
          playbackStatus: "playing",
          framePath: "renders/preview-0000.png",
        },
        {
          pause: () => {
            calls.push("pause");
            return {
              ...initialState(),
              playbackStatus: "paused",
              framePath: "renders/preview-0000.png",
            };
          },
        },
      ),
    });

    const view = panel.clickPause();

    expect(calls).toEqual(["pause"]);
    expect(view.playbackStatus).toBe("paused");
    expect(view.surface.framePath).toBe("renders/preview-0000.png");
    expect(Object.keys(view)).not.toContain("engineClient");
    expect(Object.keys(view)).not.toContain("pyxel");
  });

  it("delegates seek to the preview use case and reflects the returned frame", async () => {
    const seekTimes: number[] = [];
    const panel = new PreviewPanel({
      duration: 8,
      preview: createPreviewUseCase(initialState(), {
        seek: async (time) => {
          seekTimes.push(time);
          return {
            ...initialState(),
            currentTime: time,
            framePath: "renders/preview-0036.png",
          };
        },
      }),
    });

    const view = await panel.changeSeek(1.2);

    expect(seekTimes).toEqual([1.2]);
    expect(view.currentTime).toBe(1.2);
    expect(view.seekControl.value).toBe(1.2);
    expect(view.surface.framePath).toBe("renders/preview-0036.png");
  });

  it("uses frame-rounded time for the seek bar while preserving the precise preview time", () => {
    const panel = new PreviewPanel({
      duration: 8,
      preview: createPreviewUseCase({
        ...initialState(),
        currentTime: 1.049,
        fps: 30,
      }),
    });

    const view = panel.render();

    expect(view.currentTime).toBe(1.049);
    expect(view.seekControl.value).toBe(31 / 30);
  });


  it("uses the preview fps as the seek input step", () => {
    const panel = new PreviewPanel({
      duration: 8,
      preview: createPreviewUseCase({
        ...initialState(),
        currentTime: 1.049,
        fps: 24,
      }),
    });

    const view = panel.render();

    expect(view.seekControl.value).toBe(25 / 24);
    expect(view.seekControl.step).toBe(1 / 24);
    expect(createPreviewSeekControlStep(60)).toBe(1 / 60);
  });

  it("clamps frame-rounded seek bar time to the preview duration", () => {
    expect(roundPreviewTimeForSeekControl(-0.01, 30, 8)).toBe(0);
    expect(roundPreviewTimeForSeekControl(8.02, 30, 8)).toBe(8);
  });

  it("keeps engine errors visible as preview panel state", async () => {
    const panel = new PreviewPanel({
      duration: 8,
      preview: createPreviewUseCase(initialState(), {
        play: async () => ({
          ...initialState(),
          playbackStatus: "playing",
          error: "preview renderer is unavailable",
        }),
      }),
    });

    const view = await panel.clickPlay();

    expect(view.error).toBe("preview renderer is unavailable");
    expect(view.surface.placeholderText).toBe("Preview frame will appear here.");
  });

  it("rejects invalid seek values before sending them to the use case", async () => {
    let seekCallCount = 0;
    const panel = new PreviewPanel({
      duration: 8,
      preview: createPreviewUseCase(initialState(), {
        seek: async () => {
          seekCallCount += 1;
          return initialState();
        },
      }),
    });

    await expect(panel.changeSeek(Number.NaN)).rejects.toThrow("Preview seek time must be a finite number.");
    expect(seekCallCount).toBe(0);
  });
});

function initialState(): PreviewState {
  return {
    currentTime: 0,
    playbackStatus: "paused",
    framePath: null,
    width: 1280,
    height: 720,
    fps: 30,
    error: null,
  };
}

function createPreviewUseCase(
  state: PreviewState,
  overrides: Partial<Pick<PreviewPanelUseCase, "play" | "pause" | "seek">> = {},
): PreviewPanelUseCase {
  return {
    get state() {
      return state;
    },
    play: overrides.play ?? (async () => state),
    pause: overrides.pause ?? (() => state),
    seek: overrides.seek ?? (async () => state),
  };
}
