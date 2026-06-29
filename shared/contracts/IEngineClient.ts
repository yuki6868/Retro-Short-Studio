import type {
  EngineCommandRequest,
  EngineRequestDto,
  EngineResponseDto,
  EngineResult,
  ExportRequest,
  ExportResult,
  PreviewRequest,
  PreviewResult,
  RenderRequest,
  RenderResult,
  VoiceRequest,
  VoiceResult,
} from "../dto";

export interface EngineClient {
  execute(command: EngineCommandRequest): Promise<EngineResult>;

  preview(request: PreviewRequest): Promise<EngineResult<PreviewResult>>;
  render(request: RenderRequest): Promise<EngineResult<RenderResult>>;
  generateVoice(request: VoiceRequest): Promise<EngineResult<VoiceResult>>;
  exportVideo(request: ExportRequest): Promise<EngineResult<ExportResult>>;
}

export interface IEngineClient {
  execute<TRequestPayload = Record<string, unknown>, TResponsePayload = Record<string, unknown>>(
    request: EngineRequestDto<TRequestPayload>,
  ): Promise<EngineResponseDto<TResponsePayload>>;
}
