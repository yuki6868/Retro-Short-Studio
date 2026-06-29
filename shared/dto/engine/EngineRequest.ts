export type EngineRequestTypeDto =
  | "preview"
  | "render"
  | "voice"
  | "export"
  | "lip_sync";

export type EngineRequestDto<TPayload = Record<string, unknown>> = {
  requestId: string;
  requestType: EngineRequestTypeDto;
  payload: TPayload;
};
