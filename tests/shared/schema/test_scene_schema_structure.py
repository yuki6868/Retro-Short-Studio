from tools.ts_source import read_json


def test_scene_schema_matches_scene_dto_shape():
    schema = read_json("shared/schema/scene.schema.json")

    assert schema["title"] == "SceneDto"
    assert schema["type"] == "object"
    assert schema["additionalProperties"] is False
    assert schema["required"] == ["sceneId", "sceneName", "duration", "backgroundAssetId", "characterIds", "actions"]
    assert set(schema["properties"].keys()) == {"sceneId", "sceneName", "duration", "backgroundAssetId", "characterIds", "actions"}
    assert schema["properties"]["backgroundAssetId"]["type"] == ["string", "null"]
