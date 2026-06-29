from tools.ts_source import read


def test_character_dto_keeps_character_identity_and_image_map_reference_only():
    source = read("shared/dto/character/CharacterDto.ts")

    assert "characterId: string;" in source
    assert "characterName: string;" in source
    assert "imageMapId: string | null;" in source
    assert "expression" not in source.lower()
    assert "mouth" not in source.lower()
    assert "eye" not in source.lower()
