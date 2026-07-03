import { describe, expect, it } from "vitest";

import { DefaultFrameSequenceExporter, type FrameSequenceExportProgress, type FrameSequenceFrameWriter } from "../../app/src";
import type { EngineResult, PreviewRequest, PreviewResult, SceneDto } from "../../shared";

describe("DefaultFrameSequenceExporter", () => {
  it("exports a scene as numbered frame files using the preview renderer boundary", async () => {
    const previewTimes: number[] = [];
    const writer = new MemoryFrameWriter();
    const progress: FrameSequenceExportProgress[] = [];
    const exporter = new DefaultFrameSequenceExporter({
      commandId: "cmd-export-frames",
      engineClient: {
        preview: async (request: PreviewRequest): Promise<EngineResult<PreviewResult>> => {
          previewTimes.push(request.currentTime);
          return okPreview(`frame at ${request.currentTime.toFixed(1)}`);
        },
      },
      frameWriter: writer,
    });

    const result = await exporter.exportScene(
      {
        projectId: "project-1",
        scene: createScene({ duration: 1 }),
        outputDirectory: "renders",
        fps: 2,
        width: 320,
        height: 240,
      },
      (next) => progress.push(next),
    );

    expect(result.ok).toBe(true);
    expect(result.payload).toMatchObject({
      outputDirectory: "renders",
      fps: 2,
      duration: 1,
      frameCount: 2,
      framePaths: ["renders/frame_000001.png", "renders/frame_000002.png"],
    });
    expect(previewTimes).toEqual([0, 0.5]);
    expect(writer.paths).toEqual(["renders/frame_000001.png", "renders/frame_000002.png"]);
    expect(writer.text("renders/frame_000001.png")).toBe("frame at 0.0");
    expect(progress.map((item) => item.completedFrames)).toEqual([1, 2]);
  });

  it("normalizes nested output directories and prevents parent traversal", async () => {
    const exporter = new DefaultFrameSequenceExporter({
      engineClient: { preview: async () => okPreview("frame") },
      frameWriter: new MemoryFrameWriter(),
    });

    const ok = await exporter.exportScene({
      projectId: "project-1",
      scene: createScene({ duration: 0.5 }),
      outputDirectory: "/renders/opening/",
      fps: 1,
      width: 320,
      height: 240,
    });

    expect(ok.payload?.framePaths).toEqual(["renders/opening/frame_000001.png"]);

    const bad = await exporter.exportScene({
      projectId: "project-1",
      scene: createScene({ duration: 0.5 }),
      outputDirectory: "../outside",
      fps: 1,
      width: 320,
      height: 240,
    });

    expect(bad.ok).toBe(false);
    expect(bad.error).toContain("inside the project folder");
  });

  it("stops without writing later frames when preview rendering fails", async () => {
    const writer = new MemoryFrameWriter();
    let callCount = 0;
    const exporter = new DefaultFrameSequenceExporter({
      engineClient: {
        preview: async (): Promise<EngineResult<PreviewResult>> => {
          callCount += 1;
          if (callCount === 2) {
            return { commandId: "preview", ok: false, payload: null, error: "renderer unavailable" };
          }
          return okPreview("first");
        },
      },
      frameWriter: writer,
    });

    const result = await exporter.exportScene({
      projectId: "project-1",
      scene: createScene({ duration: 3 }),
      outputDirectory: "renders",
      fps: 1,
      width: 320,
      height: 240,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("renderer unavailable");
    expect(writer.paths).toEqual(["renders/frame_000001.png"]);
  });
});

class MemoryFrameWriter implements FrameSequenceFrameWriter {
  readonly files = new Map<string, ArrayBuffer>();

  get paths(): string[] {
    return Array.from(this.files.keys());
  }

  async writeFrame(path: string, data: ArrayBuffer): Promise<void> {
    this.files.set(path, data);
  }

  text(path: string): string {
    const data = this.files.get(path);
    if (data === undefined) {
      throw new Error(`Missing frame: ${path}`);
    }

    return Buffer.from(data).toString("utf-8");
  }
}

function okPreview(text: string): EngineResult<PreviewResult> {
  return {
    commandId: "preview",
    ok: true,
    payload: {
      framePath: `data:image/png;base64,${Buffer.from(text).toString("base64")}`,
      currentTime: 0,
      width: 320,
      height: 240,
    },
    error: null,
  };
}

function createScene(input: { duration: number }): SceneDto {
  return {
    sceneId: "scene-opening",
    sceneName: "Opening",
    duration: input.duration,
    backgroundAssetId: null,
    characterIds: [],
    characters: [],
    actions: [],
  };
}
