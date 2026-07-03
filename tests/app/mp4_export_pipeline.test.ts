import { describe, expect, it } from "vitest";

import { Mp4ExportPipeline, type FrameSequenceExporter, type FrameSequenceExportProgress, type FrameSequenceExportRequest, type FrameSequenceExportResult, type Mp4ExportPipelineProgress, type VideoExporter, type VideoExportProgress, type VideoExportRequest, type VideoExportResult } from "../../app/src";
import type { EngineResult, SceneDto } from "../../shared";

describe("Mp4ExportPipeline", () => {
  it("runs Export Frames then MP4 Export to outputs/{sceneId}.mp4", async () => {
    const frameExporter = new RecordingFrameExporter();
    const videoExporter = new RecordingVideoExporter();
    const progress: Mp4ExportPipelineProgress[] = [];
    const scene = createScene();

    const result = await new Mp4ExportPipeline({ frameSequenceExporter: frameExporter, videoExporter }).exportScene(
      {
        projectId: "project-1",
        scene,
        assets: [],
        characters: [],
        fps: 30,
        width: 1280,
        height: 720,
      },
      (next) => progress.push(next),
    );

    expect(result.ok).toBe(true);
    expect(frameExporter.requests[0]).toMatchObject({
      outputDirectory: "renders/scene-opening",
      fps: 30,
      width: 1280,
      height: 720,
      duration: 5,
    });
    expect(videoExporter.requests[0]).toMatchObject({
      outputPath: "outputs/scene-opening.mp4",
      frameSequence: { outputDirectory: "renders/scene-opening", fps: 30, duration: 5, frameCount: 150 },
    });
    expect(progress.map((item) => item.stage)).toEqual(["exporting_frames", "exporting_frames", "checking_ffmpeg", "building_audio", "encoding", "done"]);
  });

  it("stops before MP4 export when frame export fails", async () => {
    const frameExporter = new RecordingFrameExporter(false);
    const videoExporter = new RecordingVideoExporter();

    const result = await new Mp4ExportPipeline({ frameSequenceExporter: frameExporter, videoExporter }).exportScene({
      projectId: "project-1",
      scene: createScene(),
      assets: [],
      characters: [],
      fps: 30,
      width: 1280,
      height: 720,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("frame failed");
    expect(videoExporter.requests).toEqual([]);
  });
});

class RecordingFrameExporter implements FrameSequenceExporter {
  readonly requests: FrameSequenceExportRequest[] = [];

  constructor(private readonly ok = true) {}

  async exportScene(
    request: FrameSequenceExportRequest,
    onProgress?: (progress: FrameSequenceExportProgress) => void,
  ): Promise<EngineResult<FrameSequenceExportResult>> {
    this.requests.push(request);
    onProgress?.({ completedFrames: 150, totalFrames: 150, currentTime: 5, framePath: "renders/scene-opening/frame_000150.png" });

    if (!this.ok) {
      return { commandId: "frames", ok: false, payload: null, error: "frame failed" };
    }

    return {
      commandId: "frames",
      ok: true,
      payload: { outputDirectory: request.outputDirectory, framePaths: [], fps: request.fps, duration: request.duration ?? request.scene.duration, frameCount: 150 },
      error: null,
    };
  }
}

class RecordingVideoExporter implements VideoExporter {
  readonly requests: VideoExportRequest[] = [];

  async exportVideo(
    request: VideoExportRequest,
    onProgress?: (progress: VideoExportProgress) => void,
  ): Promise<EngineResult<VideoExportResult>> {
    this.requests.push(request);
    onProgress?.({ stage: "checking_ffmpeg", message: "Checking FFmpeg", outputPath: request.outputPath });
    onProgress?.({ stage: "building_audio", message: "Building audio", outputPath: request.outputPath });
    onProgress?.({ stage: "encoding", message: "Encoding MP4", outputPath: request.outputPath });
    onProgress?.({ stage: "done", message: "Done", outputPath: request.outputPath });
    return {
      commandId: "mp4",
      ok: true,
      payload: { outputPath: request.outputPath, format: "mp4", fps: request.frameSequence.fps, duration: request.frameSequence.duration, frameCount: request.frameSequence.frameCount, command: [] },
      error: null,
    };
  }
}

function createScene(): SceneDto {
  return {
    sceneId: "scene-opening",
    sceneName: "Opening",
    duration: 5,
    backgroundAssetId: null,
    characterIds: [],
    characters: [],
    actions: [],
  };
}
