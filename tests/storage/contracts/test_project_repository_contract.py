from tools.ts_source import read


def test_project_repository_contract_matches_commit_2_boundary():
    source = read("storage/src/contracts/ProjectRepository.ts")

    assert 'import type { ProjectDto, ProjectSettingsDto } from "../../../shared";' in source
    assert "export type CreateProjectOptions" in source
    assert "projectsRootPath?: string;" in source
    assert "settings?: Partial<ProjectSettingsDto>;" in source
    assert "export type CreatedProject" in source
    assert "projectPath: string;" in source
    assert "project: ProjectDto;" in source
    assert "export interface ProjectRepository" in source
    assert "create(projectName: string, options?: CreateProjectOptions): Promise<CreatedProject>;" in source
    assert "load(projectPath: string): Promise<ProjectDto>;" in source
    assert "save(projectPath: string, project: ProjectDto): Promise<void>;" in source
