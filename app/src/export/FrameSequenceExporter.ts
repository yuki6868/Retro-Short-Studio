import type { AssetDto, CharacterDto, EngineClient, EngineResult, PreviewRequest, PreviewResult, SceneDto } from "../../../shared";

export type FrameSequenceExportProgress = {
  completedFrames: number;
  totalFrames: number;
  currentTime: number;
  framePath: string;
};

export type FrameSequenceExportRequest = {
  projectId: string;
  scene: SceneDto;
  assets?: AssetDto[];
  characters?: CharacterDto[];
  outputDirectory: string;
  fps: number;
  width: number;
  height: number;
  duration?: number;
};

export type FrameSequenceExportResult = {
  outputDirectory: string;
  framePaths: string[];
  fps: number;
  duration: number;
  frameCount: number;
};

export interface FrameSequenceExporter {
  exportScene(
    request: FrameSequenceExportRequest,
    onProgress?: (progress: FrameSequenceExportProgress) => void,
  ): Promise<EngineResult<FrameSequenceExportResult>>;
}

export interface FrameSequenceFrameWriter {
  writeFrame(path: string, data: ArrayBuffer): Promise<void>;
}

export type DefaultFrameSequenceExporterConfig = {
  engineClient: Pick<EngineClient, "preview">;
  frameWriter: FrameSequenceFrameWriter;
  commandId?: string;
};

export class DefaultFrameSequenceExporter implements FrameSequenceExporter {
  private readonly commandId: string;

  constructor(private readonly config: DefaultFrameSequenceExporterConfig) {
    this.commandId = config.commandId ?? "frame-sequence-export";
  }

  async exportScene(
    request: FrameSequenceExportRequest,
    onProgress?: (progress: FrameSequenceExportProgress) => void,
  ): Promise<EngineResult<FrameSequenceExportResult>> {
    try {
      const normalized = normalizeRequest(request);
      const framePaths: string[] = [];

      for (let index = 0; index < normalized.frameCount; index += 1) {
        const currentTime = clampTime(index / normalized.fps, normalized.duration);
        const previewResult = await this.config.engineClient.preview(createPreviewRequest(normalized, currentTime));

        if (!previewResult.ok || previewResult.payload === null) {
          return failure(this.commandId, previewResult.error ?? "Preview rendering failed during frame sequence export.");
        }

        const frameData = decodePreviewFrame(previewResult.payload, index + 1);
        const framePath = createFramePath(normalized.outputDirectory, index + 1);
        await this.config.frameWriter.writeFrame(framePath, frameData);
        framePaths.push(framePath);
        onProgress?.({
          completedFrames: index + 1,
          totalFrames: normalized.frameCount,
          currentTime,
          framePath,
        });
      }

      return {
        commandId: this.commandId,
        ok: true,
        payload: {
          outputDirectory: normalized.outputDirectory,
          framePaths,
          fps: normalized.fps,
          duration: normalized.duration,
          frameCount: framePaths.length,
        },
        error: null,
      };
    } catch (error) {
      return failure(this.commandId, error instanceof Error ? error.message : "Frame sequence export failed.");
    }
  }
}

type NormalizedFrameSequenceExportRequest = Required<Pick<FrameSequenceExportRequest, "projectId" | "scene" | "outputDirectory" | "fps" | "width" | "height">> & {
  assets: AssetDto[];
  characters: CharacterDto[];
  duration: number;
  frameCount: number;
};

function normalizeRequest(request: FrameSequenceExportRequest): NormalizedFrameSequenceExportRequest {
  const fps = normalizePositiveNumber(request.fps, "fps");
  const width = Math.max(1, Math.round(normalizePositiveNumber(request.width, "width")));
  const height = Math.max(1, Math.round(normalizePositiveNumber(request.height, "height")));
  const duration = normalizePositiveNumber(request.duration ?? request.scene.duration, "duration");
  const outputDirectory = normalizeOutputDirectory(request.outputDirectory);
  const frameCount = Math.max(1, Math.ceil(duration * fps));

  if (request.projectId.trim().length === 0) {
    throw new Error("Frame sequence export requires projectId.");
  }

  return {
    projectId: request.projectId,
    scene: request.scene,
    assets: request.assets ?? [],
    characters: request.characters ?? [],
    outputDirectory,
    fps,
    width,
    height,
    duration,
    frameCount,
  };
}

function createPreviewRequest(request: NormalizedFrameSequenceExportRequest, currentTime: number): PreviewRequest {
  return {
    projectId: request.projectId,
    scene: request.scene,
    assets: request.assets,
    characters: request.characters,
    currentTime,
    width: request.width,
    height: request.height,
    fps: request.fps,
  };
}

function normalizePositiveNumber(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Frame sequence export ${name} must be a positive number.`);
  }

  return value;
}

function normalizeOutputDirectory(outputDirectory: string): string {
  const normalized = outputDirectory.replaceAll("\\", "/").replace(/^\/+/, "").replace(/\/+$/, "").trim();

  if (normalized.length === 0) {
    throw new Error("Frame sequence export outputDirectory is required.");
  }

  if (normalized.split("/").includes("..")) {
    throw new Error("Frame sequence export outputDirectory must stay inside the project folder.");
  }

  return normalized;
}

function createFramePath(outputDirectory: string, frameNumber: number): string {
  return `${outputDirectory}/frame_${String(frameNumber).padStart(6, "0")}.png`;
}

function decodePreviewFrame(payload: PreviewResult, frameNumber: number): ArrayBuffer {
  if (payload.framePath === null || payload.framePath.trim().length === 0) {
    throw new Error(`Preview did not return a frame for frame ${frameNumber}.`);
  }

  return dataUrlToArrayBuffer(payload.framePath);
}

function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const [metadata, body] = dataUrl.split(",", 2);

  if (metadata === undefined || body === undefined || !metadata.startsWith("data:")) {
    throw new Error("Preview frame must be a data URL before it can be written as an exported frame.");
  }

  if (metadata.includes(";base64")) {
    return base64ToArrayBuffer(body);
  }

  return textToArrayBuffer(decodeURIComponent(body));
}

function base64ToArrayBuffer(value: string): ArrayBuffer {
  if (typeof Buffer !== "undefined") {
    const buffer = Buffer.from(value, "base64");
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  }

  if (typeof atob === "undefined") {
    throw new Error("Base64 decoding is not available in this runtime.");
  }

  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function textToArrayBuffer(value: string): ArrayBuffer {
  if (typeof TextEncoder !== "undefined") {
    const encoded = new TextEncoder().encode(value);
    return encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength);
  }

  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index);
  }
  return bytes.buffer;
}

function clampTime(time: number, duration: number): number {
  return Math.min(Math.max(0, time), duration);
}

function failure<TPayload>(commandId: string, error: string): EngineResult<TPayload> {
  return {
    commandId,
    ok: false,
    payload: null,
    error,
  };
}
