export type EngineResponseDto<TPayload = Record<string, unknown>> = {
  requestId: string;
  success: boolean;
  payload: TPayload | null;
  errorMessage: string | null;
};
