import type { AssetDto, CharacterDto, EngineResult, SceneDto } from "../../../shared";
import type { FrameSequenceExporter, FrameSequenceExportProgress } from "./FrameSequenceExporter";
import type { VideoExporter, VideoExportProgress, VideoExportResult } from "./Mp4ExportWithVoice";

export type Mp4ExportPipelineStage = "exporting_frames" | VideoExportProgress["stage"];

export type Mp4ExportPipelineProgress = {
  stage: Mp4ExportPipelineStage;
  message: string;
  outputPath: string;
  completedFrames?: number;
  totalFrames?: number;
};

export type Mp4ExportPipelineRequest = {
  projectId: string;
  scene: SceneDto;
  assets: AssetDto[];
  characters: CharacterDto[];
  fps: number;
  width: number;
  height: number;
  frameOutputDirectory?: string;
  outputPath?: string;
};

export type Mp4ExportPipelineConfig = {
  frameSequenceExporter: FrameSequenceExporter;
  videoExporter: VideoExporter;
  commandId?: string;
};

export class Mp4ExportPipeline {
  private readonly commandId: string;

  constructor(private readonly config: Mp4ExportPipelineConfig) {
    this.commandId = config.commandId ?? "mp4-export-pipeline";
  }

  async exportScene(
    request: Mp4ExportPipelineRequest,
    onProgress?: (progress: Mp4ExportPipelineProgress) => void,
  ): Promise<EngineResult<VideoExportResult>> {
    const frameOutputDirectory = request.frameOutputDirectory ?? `renders/${request.scene.sceneId}`;
    const outputPath = request.outputPath ?? `outputs/${request.scene.sceneId}.mp4`;

    onProgress?.({ stage: "exporting_frames", message: "Exporting frames", outputPath, completedFrames: 0, totalFrames: 0 });

    const frameResult = await this.config.frameSequenceExporter.exportScene(
      {
        projectId: request.projectId,
        scene: request.scene,
        assets: request.assets,
        characters: request.characters,
        outputDirectory: frameOutputDirectory,
        fps: request.fps,
        width: request.width,
        height: request.height,
        duration: request.scene.duration,
      },
      (progress: FrameSequenceExportProgress) => {
        onProgress?.({
          stage: "exporting_frames",
          message: "Exporting frames",
          outputPath,
          completedFrames: progress.completedFrames,
          totalFrames: progress.totalFrames,
        });
      },
    );

    if (!frameResult.ok || frameResult.payload === null) {
      return failure(this.commandId, frameResult.error ?? "Frame export failed before MP4 encoding.");
    }

    return this.config.videoExporter.exportVideo(
      {
        projectId: request.projectId,
        scene: request.scene,
        assets: request.assets,
        frameSequence: frameResult.payload,
        outputPath,
        width: request.width,
        height: request.height,
      },
      (progress: VideoExportProgress) => onProgress?.({ ...progress, outputPath }),
    );
  }
}

function failure<TPayload>(commandId: string, error: string): EngineResult<TPayload> {
  return { commandId, ok: false, payload: null, error };
}
