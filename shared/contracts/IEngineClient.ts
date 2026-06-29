import type { EngineRequestDto, EngineResponseDto } from "../dto";

export interface IEngineClient {
  execute<TRequestPayload = Record<string, unknown>, TResponsePayload = Record<string, unknown>>(
    request: EngineRequestDto<TRequestPayload>,
  ): Promise<EngineResponseDto<TResponsePayload>>;
}
