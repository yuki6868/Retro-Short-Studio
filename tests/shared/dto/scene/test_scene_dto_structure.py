from tools.ts_source import read


def test_scene_dto_keeps_scene_level_contract_and_action_list():
    source = read("shared/dto/scene/SceneDto.ts")

    assert 'import type { ActionDto } from "../action/ActionDto";' in source
    assert "sceneId: string;" in source
    assert "sceneName: string;" in source
    assert "duration: number;" in source
    assert "backgroundAssetId: string | null;" in source
    assert "characterIds: string[];" in source
    assert "actions: ActionDto[];" in source
