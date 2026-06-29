import type { EngineResultPayload } from "./EngineResult";

export type EngineResponseDto<TPayload = EngineResultPayload> = {
  requestId: string;
  success: boolean;
  payload: TPayload | null;
  errorMessage: string | null;
};
