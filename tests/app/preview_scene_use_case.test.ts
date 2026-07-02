import { describe, expect, it } from "vitest";

import { PreviewSceneUseCase } from "../../app/src";
import type { ActionDto, AssetDto, EngineClient, EngineCommandRequest, EngineResult, PreviewRequest, PreviewResult, SceneDto } from "../../shared";

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



  it("exposes the generated Talk Action voice path and offset for the current preview time", async () => {
    const useCase = createUseCase(
      {
        preview: async (request) => okPreview(request.currentTime, "renders/preview-0060.png"),
      },
      {
        scene: createSceneWithActions([
          createTalkAction({
            actionId: "talk-1",
            startTime: 1,
            endTime: 3,
            payload: {
              generatedVoicePath: "projects/voices/talk-1.wav",
              voiceAssetId: "voice-asset-1",
            },
          }),
        ]),
        assets: [createVoiceAsset("voice-asset-1", "projects/voices/fallback.wav")],
        initialTime: 1.25,
      },
    );

    const state = await useCase.play();

    expect(state.voicePath).toBe("projects/voices/talk-1.wav");
    expect(state.voiceOffset).toBe(0.25);
    expect(state.audio).toEqual({
      voicePath: "projects/voices/talk-1.wav",
      offsetSeconds: 0.25,
      playbackStatus: "playing",
    });
  });

  it("falls back to voiceAssetId when generatedVoicePath is not present", async () => {
    const useCase = createUseCase(
      {
        preview: async (request) => okPreview(request.currentTime, "renders/preview-0060.png"),
      },
      {
        scene: createSceneWithActions([
          createTalkAction({
            actionId: "talk-1",
            startTime: 1,
            endTime: 3,
            payload: { voiceAssetId: "voice-asset-1" },
          }),
        ]),
        assets: [createVoiceAsset("voice-asset-1", "projects/voices/from-asset.wav")],
        initialTime: 1.5,
      },
    );

    const state = await useCase.play();

    expect(state.voicePath).toBe("projects/voices/from-asset.wav");
    expect(state.voiceOffset).toBe(0.5);
  });

  it("clears voice state when the current time is outside Talk Action range", async () => {
    const useCase = createUseCase(
      {
        preview: async (request) => okPreview(request.currentTime, "renders/preview-0000.png"),
      },
      {
        scene: createSceneWithActions([
          createTalkAction({
            actionId: "talk-1",
            startTime: 1,
            endTime: 3,
            payload: { generatedVoicePath: "projects/voices/talk-1.wav" },
          }),
        ]),
        initialTime: 0.5,
      },
    );

    const state = await useCase.play();

    expect(state.voicePath).toBeNull();
    expect(state.voiceOffset).toBe(0);
  });

  it("clears voice state when the Talk Action has no generated or resolvable voice asset", async () => {
    const useCase = createUseCase(
      {
        preview: async (request) => okPreview(request.currentTime, "renders/preview-0060.png"),
      },
      {
        scene: createSceneWithActions([
          createTalkAction({
            actionId: "talk-1",
            startTime: 1,
            endTime: 3,
            payload: { voiceAssetId: "missing-voice-asset" },
          }),
        ]),
        assets: [],
        initialTime: 1.5,
      },
    );

    const state = await useCase.play();

    expect(state.voicePath).toBeNull();
    expect(state.voiceOffset).toBe(0);
  });

  it("pause only changes preview state and does not own audio playback", () => {
    const useCase = createUseCase({
      preview: async (request) => okPreview(request.currentTime, "renders/preview.png"),
    });

    const state = useCase.pause();

    expect(state.playbackStatus).toBe("paused");
  });

  it("seek exposes Talk Action voice offset without starting or seeking audio", async () => {
    const useCase = createUseCase(
      {
        preview: async (request) => okPreview(request.currentTime, "renders/preview-0060.png"),
      },
      {
        scene: createSceneWithActions([
          createTalkAction({
            actionId: "talk-1",
            startTime: 1,
            endTime: 3,
            payload: { generatedVoicePath: "projects/voices/talk-1.wav" },
          }),
        ]),
      },
    );

    const state = await useCase.seek(1.75);

    expect(state.audio).toEqual({
      voicePath: "projects/voices/talk-1.wav",
      offsetSeconds: 0.75,
      playbackStatus: "paused",
    });
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

type PreviewUseCaseOptions = {
  scene?: SceneDto;
  assets?: AssetDto[];
  initialTime?: number;
};

function createUseCase(overrides: Pick<EngineClient, "preview">, options: PreviewUseCaseOptions = {}): PreviewSceneUseCase {
  return new PreviewSceneUseCase({
    projectId: "project-1",
    scene: options.scene ?? scene,
    ...(options.assets === undefined ? {} : { assets: options.assets }),
    ...(options.initialTime === undefined ? {} : { initialTime: options.initialTime }),
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


function createSceneWithActions(actions: ActionDto[]): SceneDto {
  return {
    ...scene,
    actions,
  };
}

function createTalkAction(input: {
  actionId: string;
  startTime: number;
  endTime: number;
  payload: Record<string, unknown>;
}): ActionDto {
  return {
    actionId: input.actionId,
    actionType: "talk",
    startTime: input.startTime,
    endTime: input.endTime,
    targetId: "character-instance-1",
    payload: input.payload,
  };
}

function createVoiceAsset(assetId: string, assetPath: string): AssetDto {
  return {
    assetId,
    assetName: assetId,
    assetType: "voice",
    assetPath,
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
