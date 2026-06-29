from tools.ts_source import extract_block_after, read


def test_project_json_serializer_is_plain_dto_json_serializer():
    source = read("storage/src/local/ProjectJsonSerializer.ts")

    assert 'import type { IProjectSerializer, ProjectDto } from "../../../shared";' in source
    assert "export class ProjectJsonSerializer implements IProjectSerializer" in source

    serialize_body = extract_block_after(source, "serialize(project: ProjectDto): string")
    deserialize_body = extract_block_after(source, "deserialize(serializedProject: string): ProjectDto")

    assert "return `${JSON.stringify(project, null, 2)}\\n`;" in serialize_body
    assert "return JSON.parse(serializedProject) as ProjectDto;" in deserialize_body
    assert "readFile" not in source
    assert "writeFile" not in source
    assert "mkdir" not in source
