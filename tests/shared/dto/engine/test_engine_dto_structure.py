from tools.ts_source import read


def test_engine_request_supports_preview_render_voice_export_lip_sync_commands():
    source = read("shared/dto/engine/EngineRequest.ts")

    for request_type in ["preview", "render", "voice", "export", "lip_sync"]:
        assert f'| "{request_type}"' in source
    assert "requestId: string;" in source
    assert "requestType: EngineRequestTypeDto;" in source
    assert "payload: TPayload;" in source


def test_engine_response_has_success_payload_and_error_channel():
    source = read("shared/dto/engine/EngineResponse.ts")

    assert "requestId: string;" in source
    assert "success: boolean;" in source
    assert "payload: TPayload | null;" in source
    assert "errorMessage: string | null;" in source
