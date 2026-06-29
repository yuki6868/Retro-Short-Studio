import type { EngineCommand } from "./EngineCommand";
import type { ExportRequest } from "./ExportRequest";
import type { PreviewRequest } from "./PreviewRequest";
import type { RenderRequest } from "./RenderRequest";
import type { VoiceRequest } from "./VoiceRequest";

export type EngineRequestTypeDto = EngineCommand;

export type EngineRequestPayload = PreviewRequest | RenderRequest | VoiceRequest | ExportRequest;

export type EngineRequestDto<TPayload = EngineRequestPayload> = {
  requestId: string;
  requestType: EngineRequestTypeDto;
  payload: TPayload;
};

export type EngineCommandRequest<TPayload = EngineRequestPayload> = {
  commandId: string;
  command: EngineCommand;
  payload: TPayload;
};
