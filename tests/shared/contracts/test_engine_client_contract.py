from tools.ts_source import read


def test_engine_client_contract_uses_request_and_response_dtos_only():
    source = read("shared/contracts/IEngineClient.ts")

    assert 'import type { EngineRequestDto, EngineResponseDto } from "../dto";' in source
    assert "export interface IEngineClient" in source
    assert "execute<TRequestPayload = Record<string, unknown>, TResponsePayload = Record<string, unknown>>(" in source
    assert "request: EngineRequestDto<TRequestPayload>" in source
    assert "Promise<EngineResponseDto<TResponsePayload>>" in source
