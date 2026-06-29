from tools.ts_source import read


def test_dto_index_exports_each_dto_area():
    source = read("shared/dto/index.ts")

    assert 'export type { ActionDto, ActionTypeDto } from "./action";' in source
    assert 'export type { AssetDto, AssetTypeDto } from "./asset";' in source
    assert 'export type { CharacterDto } from "./character";' in source
    assert 'export type { EngineRequestDto, EngineRequestTypeDto, EngineResponseDto } from "./engine";' in source
    assert 'export type { ProjectDto, ProjectSettingsDto } from "./project";' in source
    assert 'export type { SceneDto } from "./scene";' in source
