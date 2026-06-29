from tools.ts_source import read


def test_action_dto_is_time_based_event_contract():
    source = read("shared/dto/action/ActionDto.ts")

    for action_type in ["talk", "move", "fade", "flash", "camera_move", "camera_zoom", "custom"]:
        assert f'| "{action_type}"' in source
    assert "actionId: string;" in source
    assert "actionType: ActionTypeDto;" in source
    assert "startTime: number;" in source
    assert "endTime: number;" in source
    assert "targetId: string | null;" in source
    assert "payload: Record<string, unknown>;" in source
