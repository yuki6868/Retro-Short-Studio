import type { ExportResult } from "./ExportRequest";
import type { PreviewResult } from "./PreviewRequest";
import type { RenderResult } from "./RenderRequest";
import type { VoiceResult } from "./VoiceRequest";

export type EngineResultPayload = PreviewResult | RenderResult | VoiceResult | ExportResult;

export type EngineResult<TPayload = EngineResultPayload> = {
  commandId: string;
  ok: boolean;
  payload: TPayload | null;
  error: string | null;
};
