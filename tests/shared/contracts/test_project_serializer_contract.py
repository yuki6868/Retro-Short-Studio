from tools.ts_source import read


def test_project_serializer_contract_serializes_plain_project_dto():
    source = read("shared/contracts/IProjectSerializer.ts")

    assert 'import type { ProjectDto } from "../dto";' in source
    assert "export interface IProjectSerializer" in source
    assert "serialize(project: ProjectDto): string;" in source
    assert "deserialize(serializedProject: string): ProjectDto;" in source
