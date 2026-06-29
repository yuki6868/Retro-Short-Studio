import { describe, expect, it } from "vitest";

import { PreviewSceneUseCase } from "../../app/src";
import type { EngineClient, EngineCommandRequest, EngineResult, PreviewRequest, PreviewResult, SceneDto } from "../../shared";

const scene: SceneDto = {
  sceneId: "scene-1",
  sceneName: "Opening",
  duration: 5,
  backgroundAssetId: "asset-bg-1",
  characterIds: ["character-instance-1"],
  actions: [],
};

describe("PreviewSceneUseCase", () => {
  it("starts playback and asks the engine for a preview frame at the current time", async () => {
    const requests: PreviewRequest[] = [];
    const useCase = createUseCase({
      preview: async (request) => {
        requests.push(request);
        return okPreview(request.currentTime, "renders/preview-0000.png");
      },
    });

    const state = await useCase.play();

    expect(state.playbackStatus).toBe("playing");
    expect(state.currentTime).toBe(0);
    expect(state.framePath).toBe("renders/preview-0000.png");
    expect(requests).toEqual([
      {
        projectId: "project-1",
        scene,
        currentTime: 0,
        width: 1280,
        height: 720,
        fps: 30,
      },
    ]);
  });

  it("pauses without calling the engine because pause is a local preview state change", () => {
    let previewCallCount = 0;
    const useCase = createUseCase({
      preview: async (request) => {
        previewCallCount += 1;
        return okPreview(request.currentTime, null);
      },
    });

    const state = useCase.pause();

    expect(state.playbackStatus).toBe("paused");
    expect(previewCallCount).toBe(0);
  });

  it("seeks to a time and renders that scene frame through the engine boundary", async () => {
    const requests: PreviewRequest[] = [];
    const useCase = createUseCase({
      preview: async (request) => {
        requests.push(request);
        return okPreview(request.currentTime, "renders/preview-0036.png");
      },
    });

    const state = await useCase.seek(1.2);

    expect(state.currentTime).toBe(1.2);
    expect(state.framePath).toBe("renders/preview-0036.png");
    expect(requests[0]?.currentTime).toBe(1.2);
  });

  it("clamps seek time to the scene range before sending the preview request", async () => {
    const requests: PreviewRequest[] = [];
    const useCase = createUseCase({
      preview: async (request) => {
        requests.push(request);
        return okPreview(request.currentTime, null);
      },
    });

    await useCase.seek(-10);
    await useCase.seek(99);

    expect(requests.map((request) => request.currentTime)).toEqual([0, 5]);
  });

  it("keeps preview state usable when the engine returns an error", async () => {
    const useCase = createUseCase({
      preview: async () => ({
        commandId: "cmd-preview-1",
        ok: false,
        payload: null,
        error: "preview renderer is unavailable",
      }),
    });

    const state = await useCase.play();

    expect(state.playbackStatus).toBe("playing");
    expect(state.currentTime).toBe(0);
    expect(state.framePath).toBeNull();
    expect(state.error).toBe("preview renderer is unavailable");
  });

  it("does not expose Pyxel, VOICEVOX, or ffmpeg details in preview state", async () => {
    const useCase = createUseCase({
      preview: async (request) => okPreview(request.currentTime, "renders/preview.png"),
    });

    const state = await useCase.play();

    expect(Object.keys(state)).not.toContain("pyxel");
    expect(Object.keys(state)).not.toContain("voicevox");
    expect(Object.keys(state)).not.toContain("ffmpeg");
  });
});

function createUseCase(overrides: Pick<EngineClient, "preview">): PreviewSceneUseCase {
  return new PreviewSceneUseCase({
    projectId: "project-1",
    scene,
    engineClient: createEngineClient(overrides),
    width: 1280,
    height: 720,
    fps: 30,
  });
}

function createEngineClient(overrides: Pick<EngineClient, "preview">): EngineClient {
  return {
    async execute(command: EngineCommandRequest): Promise<EngineResult> {
      return {
        commandId: command.commandId,
        ok: true,
        payload: null,
        error: null,
      };
    },
    preview: overrides.preview,
    async render() {
      throw new Error("render is not used by PreviewSceneUseCase.");
    },
    async generateVoice() {
      throw new Error("generateVoice is not used by PreviewSceneUseCase.");
    },
    async exportVideo() {
      throw new Error("exportVideo is not used by PreviewSceneUseCase.");
    },
  };
}

function okPreview(currentTime: number, framePath: string | null): EngineResult<PreviewResult> {
  return {
    commandId: "cmd-preview-1",
    ok: true,
    payload: {
      framePath,
      currentTime,
      width: 1280,
      height: 720,
    },
    error: null,
  };
}
