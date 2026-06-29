from tools.ts_source import read


def test_project_dto_is_root_contract_for_project_file():
    source = read("shared/dto/project/ProjectDto.ts")

    assert 'import type { AssetDto } from "../asset/AssetDto";' in source
    assert 'import type { CharacterDto } from "../character/CharacterDto";' in source
    assert 'import type { SceneDto } from "../scene/SceneDto";' in source
    assert "projectId: string;" in source
    assert "projectName: string;" in source
    assert "settings: ProjectSettingsDto;" in source
    assert "assets: AssetDto[];" in source
    assert "characters: CharacterDto[];" in source
    assert "scenes: SceneDto[];" in source


def test_project_settings_dto_contains_output_size_and_fps_only():
    source = read("shared/dto/project/ProjectDto.ts")

    assert "width: number;" in source
    assert "height: number;" in source
    assert "fps: number;" in source
    assert "database" not in source.lower()
    assert "pyxel" not in source.lower()
