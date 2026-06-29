import { describe, expect, it } from "vitest";
import type {
  EngineClient,
  EngineCommandRequest,
  EngineResult,
  ExportRequest,
  PreviewRequest,
  RenderRequest,
  VoiceRequest,
} from "../../shared";

const scene = {
  sceneId: "scene-1",
  sceneName: "Opening",
  duration: 5,
  backgroundAssetId: "asset-bg-1",
  characterIds: ["character-instance-1"],
  actions: [],
};

describe("Engine API Boundary", () => {
  it("defines preview request without exposing Pyxel details", () => {
    const request: PreviewRequest = {
      projectId: "project-1",
      scene,
      currentTime: 1.2,
      width: 1280,
      height: 720,
      fps: 30,
    };

    expect(request.scene.sceneId).toBe("scene-1");
    expect(Object.keys(request)).not.toContain("pyxel");
    expect(Object.keys(request)).not.toContain("voicevox");
  });

  it("defines render request as frame rendering boundary", () => {
    const request: RenderRequest = {
      projectId: "project-1",
      scene,
      outputDirectory: "renders/opening",
      fps: 30,
      width: 1280,
      height: 720,
    };

    expect(request.outputDirectory).toBe("renders/opening");
  });

  it("defines voice request without coupling callers to VOICEVOX", () => {
    const request: VoiceRequest = {
      projectId: "project-1",
      talkActionId: "action-talk-1",
      text: "こんにちは",
      speakerId: "zundamon-normal",
      outputPath: "voices/action-talk-1.wav",
    };

    expect(request.text).toBe("こんにちは");
    expect(Object.keys(request)).not.toContain("voicevox");
  });

  it("defines export request without coupling callers to ffmpeg", () => {
    const request: ExportRequest = {
      projectId: "project-1",
      renderDirectory: "renders/opening",
      audioPaths: ["voices/action-talk-1.wav"],
      outputPath: "exports/opening.mp4",
      format: "mp4",
      fps: 30,
    };

    expect(request.format).toBe("mp4");
    expect(Object.keys(request)).not.toContain("ffmpeg");
  });

  it("allows an EngineClient implementation to be swapped behind the interface", async () => {
    const calls: EngineCommandRequest[] = [];
    const client: EngineClient = {
      async execute(command) {
        calls.push(command);
        return {
          commandId: command.commandId,
          ok: true,
          payload: { framePath: "renders/preview.png", currentTime: 0, width: 1280, height: 720 },
          error: null,
        } satisfies EngineResult;
      },
      async preview(request) {
        return this.execute({ commandId: "cmd-preview-1", command: "preview", payload: request }) as Promise<EngineResult<{ framePath: string | null; currentTime: number; width: number; height: number }>>;
      },
      async render(request) {
        return this.execute({ commandId: "cmd-render-1", command: "render", payload: request }) as Promise<EngineResult<{ framePaths: string[]; outputDirectory: string }>>;
      },
      async generateVoice(request) {
        return this.execute({ commandId: "cmd-voice-1", command: "voice", payload: request }) as Promise<EngineResult<{ voiceAssetId: string | null; wavPath: string; duration: number }>>;
      },
      async exportVideo(request) {
        return this.execute({ commandId: "cmd-export-1", command: "export", payload: request }) as Promise<EngineResult<{ outputPath: string; format: "mp4" | "gif" | "frame_sequence" }>>;
      },
    };

    const result = await client.preview({
      projectId: "project-1",
      scene,
      currentTime: 0,
      width: 1280,
      height: 720,
      fps: 30,
    });

    expect(result.ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.command).toBe("preview");
  });
});
