import type {
  EngineClient,
  EngineCommandRequest,
  EngineResult,
  ExportRequest,
  ExportResult,
  PreviewRequest,
  PreviewResult,
  RenderRequest,
  RenderResult,
  VoiceRequest,
  VoiceResult,
} from "../../../shared";
import { DefaultPreviewRenderFrameBuilder, type PreviewRenderFrameBuilder, type PreviewRenderFramePayload } from "./PreviewRenderFrameBuilder";

export type PreviewFrameTransport = {
  sendPreviewFrame(commandId: string, frame: PreviewRenderFramePayload): Promise<EngineResult<PreviewResult>>;
};

export type VoiceTransport = {
  sendVoice(commandId: string, request: VoiceRequest): Promise<EngineResult<VoiceResult>>;
};

export type PyxelPreviewEngineClientConfig = {
  commandId?: string;
  frameBuilder?: PreviewRenderFrameBuilder;
  transport?: PreviewFrameTransport;
  voiceTransport?: VoiceTransport;
};

export class PyxelPreviewEngineClient implements EngineClient {
  private readonly commandId: string;
  private readonly frameBuilder: PreviewRenderFrameBuilder;
  private readonly transport: PreviewFrameTransport;
  private readonly voiceTransport: VoiceTransport;

  constructor(config: PyxelPreviewEngineClientConfig = {}) {
    this.commandId = config.commandId ?? "pyxel-preview";
    this.frameBuilder = config.frameBuilder ?? new DefaultPreviewRenderFrameBuilder();
    this.transport = config.transport ?? new FastApiPreviewTransport();
    this.voiceTransport = config.voiceTransport ?? new FastApiVoiceTransport();
  }

  async execute(command: EngineCommandRequest): Promise<EngineResult> {
    return {
      commandId: command.commandId,
      ok: false,
      payload: null,
      error: `PyxelPreviewEngineClient does not execute generic command: ${command.commandId}.`,
    };
  }

  async preview(request: PreviewRequest): Promise<EngineResult<PreviewResult>> {
    try {
      const frame = this.frameBuilder.build(request);
      return await this.transport.sendPreviewFrame(this.commandId, frame);
    } catch (error) {
      return {
        commandId: this.commandId,
        ok: false,
        payload: null,
        error: error instanceof Error ? error.message : "Pyxel preview failed.",
      };
    }
  }

  async render(_request: RenderRequest): Promise<EngineResult<RenderResult>> {
    return unsupportedResult("render");
  }

  async generateVoice(request: VoiceRequest): Promise<EngineResult<VoiceResult>> {
    try {
      return await this.voiceTransport.sendVoice(`${this.commandId}-voice`, request);
    } catch (error) {
      return {
        commandId: `${this.commandId}-voice`,
        ok: false,
        payload: null,
        error: error instanceof Error ? error.message : "Voice generation failed.",
      };
    }
  }

  async exportVideo(_request: ExportRequest): Promise<EngineResult<ExportResult>> {
    return unsupportedResult("exportVideo");
  }
}

export class FastApiPreviewTransport implements PreviewFrameTransport {
  constructor(private readonly endpoint = "http://localhost:8000/api/preview/frame") {}

  async sendPreviewFrame(commandId: string, frame: PreviewRenderFramePayload): Promise<EngineResult<PreviewResult>> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commandId, command: "preview", payload: frame }),
    });

    if (!response.ok) {
      return {
        commandId,
        ok: false,
        payload: null,
        error: `Preview API returned HTTP ${response.status}. Start backend with: cd backend && uvicorn app.main:app --reload`,
      };
    }

    const body = (await response.json()) as EngineResult<PreviewResult>;
    return body;
  }
}

export class FastApiVoiceTransport implements VoiceTransport {
  constructor(private readonly endpoint = "http://localhost:8000/api/voice/generate") {}

  async sendVoice(commandId: string, request: VoiceRequest): Promise<EngineResult<VoiceResult>> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commandId, command: "voice", payload: request }),
    });

    if (!response.ok) {
      return {
        commandId,
        ok: false,
        payload: null,
        error: `Voice API returned HTTP ${response.status}. Start backend with: cd backend && uvicorn app.main:app --reload`,
      };
    }

    return (await response.json()) as EngineResult<VoiceResult>;
  }
}

function unsupportedResult<TPayload>(commandName: string): EngineResult<TPayload> {
  return {
    commandId: "pyxel-preview",
    ok: false,
    payload: null,
    error: `PyxelPreviewEngineClient does not support ${commandName}.`,
  };
}
