from tools.ts_source import read_json


def test_project_schema_matches_project_dto_root_shape():
    schema = read_json("shared/schema/project.schema.json")

    assert schema["title"] == "ProjectDto"
    assert schema["type"] == "object"
    assert schema["additionalProperties"] is False
    assert schema["required"] == ["projectId", "projectName", "settings", "assets", "characters", "scenes"]
    assert set(schema["properties"].keys()) == {"projectId", "projectName", "settings", "assets", "characters", "scenes"}


def test_project_schema_settings_matches_project_settings_dto():
    settings = read_json("shared/schema/project.schema.json")["properties"]["settings"]

    assert settings["additionalProperties"] is False
    assert settings["required"] == ["width", "height", "fps"]
    assert set(settings["properties"].keys()) == {"width", "height", "fps"}
