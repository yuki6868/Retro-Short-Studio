from tools.ts_source import read


def test_asset_dto_represents_external_file_reference_contract():
    source = read("shared/dto/asset/AssetDto.ts")

    for asset_type in ["background", "character_image", "voice", "bgm", "se", "effect"]:
        assert f'| "{asset_type}"' in source
    assert "assetId: string;" in source
    assert "assetName: string;" in source
    assert "assetType: AssetTypeDto;" in source
    assert "assetPath: string;" in source
    assert "Buffer" not in source
    assert "Blob" not in source
