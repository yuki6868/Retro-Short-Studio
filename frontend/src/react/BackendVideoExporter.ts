import type { EngineResult } from "../../../shared";
import type { VideoExporter, VideoExportProgress, VideoExportRequest, VideoExportResult } from "../../../app/src";

export type BackendVideoExporterConfig = {
  backendBaseUrl?: string;
};

export class BackendVideoExporter implements VideoExporter {
  private readonly backendBaseUrl: string;

  constructor(config: BackendVideoExporterConfig = {}) {
    this.backendBaseUrl = config.backendBaseUrl ?? "http://localhost:8000";
  }

  async exportVideo(
    request: VideoExportRequest,
    onProgress?: (progress: VideoExportProgress) => void,
  ): Promise<EngineResult<VideoExportResult>> {
    onProgress?.({ stage: "checking_ffmpeg", message: "Checking FFmpeg", outputPath: request.outputPath });
    onProgress?.({ stage: "building_audio", message: "Building audio", outputPath: request.outputPath });
    onProgress?.({ stage: "encoding", message: "Encoding MP4", outputPath: request.outputPath });

    const response = await fetch(`${this.backendBaseUrl}/api/export/mp4`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commandId: "mp4-export", command: "export", payload: request }),
    });

    let body: EngineResult<VideoExportResult>;
    try {
      body = (await response.json()) as EngineResult<VideoExportResult>;
    } catch {
      return failure("mp4-export", `MP4 export failed: ${response.status}`);
    }

    if (!response.ok || !body.ok || body.payload === null) {
      return failure(body.commandId ?? "mp4-export", body.error ?? `MP4 export failed: ${response.status}`);
    }

    onProgress?.({ stage: "done", message: "Done", outputPath: body.payload.outputPath });
    return body;
  }
}

function failure<TPayload>(commandId: string, error: string): EngineResult<TPayload> {
  return { commandId, ok: false, payload: null, error };
}
