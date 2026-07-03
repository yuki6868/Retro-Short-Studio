import type { AssetDto, EngineResult, SceneDto } from "../../../shared";
import type { FrameSequenceExportResult } from "./FrameSequenceExporter";

export type VideoExportProgressStage = "checking_ffmpeg" | "building_audio" | "encoding" | "done";

export type VideoExportProgress = {
  stage: VideoExportProgressStage;
  message: string;
  outputPath: string;
};

export type VideoExportRequest = {
  projectId: string;
  scene: SceneDto;
  assets?: AssetDto[];
  frameSequence: Pick<FrameSequenceExportResult, "outputDirectory" | "fps" | "duration" | "frameCount">;
  outputPath: string;
  width: number;
  height: number;
  ffmpegPath?: string;
};

export type VideoExportResult = {
  outputPath: string;
  format: "mp4";
  fps: number;
  duration: number;
  frameCount: number;
  command: string[];
};

export interface VideoExporter {
  exportVideo(
    request: VideoExportRequest,
    onProgress?: (progress: VideoExportProgress) => void,
  ): Promise<EngineResult<VideoExportResult>>;
}

export type FfmpegRunResult = {
  exitCode: number;
  stderr?: string;
};

export interface FfmpegProcessRunner {
  run(command: string, args: string[]): Promise<FfmpegRunResult>;
}

export type VoiceClip = {
  path: string;
  startTime: number;
  endTime: number;
};

export type AudioTrackBuildResult = {
  clips: VoiceClip[];
  inputs: string[];
  filterComplex: string;
  outputLabel: string;
};

export class AudioTrackBuilder {
  build(input: { scene: SceneDto; assets: AssetDto[]; duration: number }): AudioTrackBuildResult {
    const clips = collectVoiceClips(input.scene, input.assets, input.duration);
    return {
      clips,
      inputs: clips.map((clip) => clip.path),
      filterComplex: createAudioFilterComplex(clips, input.duration),
      outputLabel: "[aout]",
    };
  }
}

export class SilentAudioGenerator {
  createInput(input: { duration: number }): string[] {
    const duration = normalizePositiveNumber(input.duration, "duration");
    return ["-f", "lavfi", "-t", formatSeconds(duration), "-i", "anullsrc=channel_layout=stereo:sample_rate=44100"];
  }
}

export type FFmpegCommandBuildInput = {
  ffmpegPath: string;
  frameDirectory: string;
  fps: number;
  duration: number;
  width: number;
  height: number;
  outputPath: string;
  audio: AudioTrackBuildResult;
};

export class FFmpegCommandBuilder {
  build(input: FFmpegCommandBuildInput): string[] {
    const fps = normalizePositiveNumber(input.fps, "fps");
    const duration = normalizePositiveNumber(input.duration, "duration");
    const width = Math.max(1, Math.round(normalizePositiveNumber(input.width, "width")));
    const height = Math.max(1, Math.round(normalizePositiveNumber(input.height, "height")));
    const framePattern = `${normalizeRelativePath(input.frameDirectory, "frameDirectory")}/frame_%06d.png`;
    const silentAudio = new SilentAudioGenerator().createInput({ duration });

    return [
      input.ffmpegPath,
      "-y",
      "-framerate",
      formatSeconds(fps),
      "-i",
      framePattern,
      ...silentAudio,
      ...input.audio.inputs.flatMap((path) => ["-i", normalizeRelativePath(path, "voice path")]),
      "-filter_complex",
      input.audio.filterComplex,
      "-map",
      "0:v:0",
      "-map",
      input.audio.outputLabel,
      "-t",
      formatSeconds(duration),
      "-r",
      formatSeconds(fps),
      "-s",
      `${width}x${height}`,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-shortest",
      normalizeRelativePath(input.outputPath, "outputPath"),
    ];
  }
}

export type FfmpegExporterConfig = {
  processRunner: FfmpegProcessRunner;
  audioTrackBuilder?: AudioTrackBuilder;
  commandBuilder?: FFmpegCommandBuilder;
  commandId?: string;
};

export class FfmpegExporter implements VideoExporter {
  private readonly commandId: string;
  private readonly audioTrackBuilder: AudioTrackBuilder;
  private readonly commandBuilder: FFmpegCommandBuilder;

  constructor(private readonly config: FfmpegExporterConfig) {
    this.commandId = config.commandId ?? "mp4-export";
    this.audioTrackBuilder = config.audioTrackBuilder ?? new AudioTrackBuilder();
    this.commandBuilder = config.commandBuilder ?? new FFmpegCommandBuilder();
  }

  async exportVideo(
    request: VideoExportRequest,
    onProgress?: (progress: VideoExportProgress) => void,
  ): Promise<EngineResult<VideoExportResult>> {
    try {
      const normalized = normalizeVideoExportRequest(request);
      const ffmpegPath = request.ffmpegPath ?? "ffmpeg";

      onProgress?.({ stage: "checking_ffmpeg", message: "Checking FFmpeg availability.", outputPath: normalized.outputPath });
      const availability = await this.config.processRunner.run(ffmpegPath, ["-version"]);
      if (availability.exitCode !== 0) {
        return failure(this.commandId, createFfmpegMissingMessage(availability.stderr));
      }

      onProgress?.({ stage: "building_audio", message: "Building talk action audio track.", outputPath: normalized.outputPath });
      const audio = this.audioTrackBuilder.build({ scene: normalized.scene, assets: normalized.assets, duration: normalized.duration });
      const command = this.commandBuilder.build({
        ffmpegPath,
        frameDirectory: normalized.frameDirectory,
        fps: normalized.fps,
        duration: normalized.duration,
        width: normalized.width,
        height: normalized.height,
        outputPath: normalized.outputPath,
        audio,
      });

      onProgress?.({ stage: "encoding", message: "Encoding H.264/AAC MP4 with FFmpeg.", outputPath: normalized.outputPath });
      const [, ...args] = command;
      const encode = await this.config.processRunner.run(ffmpegPath, args);
      if (encode.exitCode !== 0) {
        return failure(this.commandId, createFfmpegEncodeMessage(encode.stderr));
      }

      onProgress?.({ stage: "done", message: "MP4 export completed.", outputPath: normalized.outputPath });
      return {
        commandId: this.commandId,
        ok: true,
        payload: {
          outputPath: normalized.outputPath,
          format: "mp4",
          fps: normalized.fps,
          duration: normalized.duration,
          frameCount: normalized.frameCount,
          command,
        },
        error: null,
      };
    } catch (error) {
      return failure(this.commandId, error instanceof Error ? error.message : "MP4 export failed.");
    }
  }
}

type NormalizedVideoExportRequest = {
  projectId: string;
  scene: SceneDto;
  assets: AssetDto[];
  frameDirectory: string;
  outputPath: string;
  fps: number;
  duration: number;
  frameCount: number;
  width: number;
  height: number;
};

function normalizeVideoExportRequest(request: VideoExportRequest): NormalizedVideoExportRequest {
  if (request.projectId.trim().length === 0) {
    throw new Error("MP4 export requires projectId.");
  }

  return {
    projectId: request.projectId,
    scene: request.scene,
    assets: request.assets ?? [],
    frameDirectory: normalizeRelativePath(request.frameSequence.outputDirectory, "frameSequence.outputDirectory"),
    outputPath: normalizeMp4OutputPath(request.outputPath),
    fps: normalizePositiveNumber(request.frameSequence.fps, "fps"),
    duration: normalizePositiveNumber(request.frameSequence.duration, "duration"),
    frameCount: Math.max(1, Math.round(normalizePositiveNumber(request.frameSequence.frameCount, "frameCount"))),
    width: Math.max(1, Math.round(normalizePositiveNumber(request.width, "width"))),
    height: Math.max(1, Math.round(normalizePositiveNumber(request.height, "height"))),
  };
}

function collectVoiceClips(scene: SceneDto, assets: AssetDto[], duration: number): VoiceClip[] {
  return scene.actions
    .filter((action) => action.actionType === "talk")
    .map((action): VoiceClip | null => {
      const payloadPath = stringPayload(action.payload.generatedVoicePath);
      const assetPath = stringPayload(action.payload.voiceAssetId) === null ? null : resolveAssetPath(assets, stringPayload(action.payload.voiceAssetId));
      const path = payloadPath ?? assetPath;

      if (path === null) {
        return null;
      }

      const startTime = clamp(action.startTime, 0, duration);
      const endTime = clamp(action.endTime, startTime, duration);
      if (endTime <= startTime) {
        return null;
      }

      return { path: normalizeRelativePath(path, "voice path"), startTime, endTime };
    })
    .filter((clip): clip is VoiceClip => clip !== null)
    .sort((left, right) => left.startTime - right.startTime || left.path.localeCompare(right.path));
}

function resolveAssetPath(assets: AssetDto[], assetId: string | null): string | null {
  if (assetId === null) {
    return null;
  }

  const asset = assets.find((candidate) => candidate.assetId === assetId && candidate.assetType === "voice");
  return asset?.assetPath ?? null;
}

function stringPayload(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function createAudioFilterComplex(clips: VoiceClip[], duration: number): string {
  const normalizedDuration = formatSeconds(duration);
  const filters = [`[1:a]atrim=0:${normalizedDuration},asetpts=PTS-STARTPTS[silence]`];
  const labels = ["[silence]"];

  clips.forEach((clip, index) => {
    const inputIndex = index + 2;
    const label = `[voice${index}]`;
    const delayMs = Math.round(clip.startTime * 1000);
    const clipDuration = Math.max(0, clip.endTime - clip.startTime);
    filters.push(
      `[${inputIndex}:a]atrim=0:${formatSeconds(clipDuration)},asetpts=PTS-STARTPTS,adelay=${delayMs}|${delayMs}${label}`,
    );
    labels.push(label);
  });

  filters.push(`${labels.join("")}amix=inputs=${labels.length}:duration=longest:dropout_transition=0,atrim=0:${normalizedDuration},asetpts=PTS-STARTPTS[aout]`);
  return filters.join(";");
}

function normalizeMp4OutputPath(path: string): string {
  const normalized = normalizeRelativePath(path, "outputPath");
  if (!normalized.toLowerCase().endsWith(".mp4")) {
    throw new Error("MP4 export outputPath must end with .mp4.");
  }
  return normalized;
}

function normalizeRelativePath(path: string, name: string): string {
  const normalized = path.replaceAll("\\", "/").replace(/^\/+/, "").replace(/\/+$/, "").trim();

  if (normalized.length === 0) {
    throw new Error(`MP4 export ${name} is required.`);
  }

  if (normalized.split("/").includes("..")) {
    throw new Error(`MP4 export ${name} must stay inside the project folder.`);
  }

  return normalized;
}

function normalizePositiveNumber(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`MP4 export ${name} must be a positive number.`);
  }
  return value;
}

function formatSeconds(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function createFfmpegMissingMessage(stderr?: string): string {
  const detail = stderr?.trim();
  return detail === undefined || detail.length === 0
    ? "FFmpeg is not available. Install FFmpeg and make sure the ffmpeg command is on PATH."
    : `FFmpeg is not available. Install FFmpeg and make sure the ffmpeg command is on PATH. Details: ${detail}`;
}

function createFfmpegEncodeMessage(stderr?: string): string {
  const detail = stderr?.trim();
  return detail === undefined || detail.length === 0 ? "FFmpeg MP4 export failed." : `FFmpeg MP4 export failed: ${detail}`;
}

function failure<TPayload>(commandId: string, error: string): EngineResult<TPayload> {
  return { commandId, ok: false, payload: null, error };
}
