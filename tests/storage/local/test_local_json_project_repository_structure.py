from tools.ts_source import assert_contains_in_order, extract_block_after, read


def test_local_json_repository_implements_repository_and_uses_json_serializer_by_default():
    source = read("storage/src/local/LocalJsonProjectRepository.ts")

    assert "export class LocalJsonProjectRepository implements ProjectRepository" in source
    assert "private readonly serializer: IProjectSerializer = new ProjectJsonSerializer()" in source
    assert 'import { randomUUID } from "node:crypto";' in source
    assert 'import { readFile, writeFile } from "node:fs/promises";' in source
    assert 'import path from "node:path";' in source


def test_local_json_repository_create_initializes_project_folder_and_default_project_dto():
    source = read("storage/src/local/LocalJsonProjectRepository.ts")
    body = source[source.find("const normalizedProjectName"):source.find("async load")]

    assert_contains_in_order(
        body,
        [
            "const normalizedProjectName = normalizeProjectName(projectName);",
            "const projectsRootPath = options.projectsRootPath ?? DEFAULT_PROJECTS_ROOT_PATH;",
            "const projectPath = path.join(projectsRootPath, normalizedProjectName);",
            "await ensureProjectFolder(projectPath);",
            "const project: ProjectDto = {",
            "projectId: randomUUID(),",
            "projectName,",
            "settings: {",
            "...DEFAULT_PROJECT_SETTINGS,",
            "...options.settings,",
            "assets: [],",
            "characters: [],",
            "scenes: [],",
            "await this.save(projectPath, project);",
            "return {",
            "projectPath,",
            "project,",
        ],
    )


def test_local_json_repository_load_only_reads_project_file_and_deserializes():
    source = read("storage/src/local/LocalJsonProjectRepository.ts")
    body = extract_block_after(source, "async load(projectPath: string): Promise<ProjectDto>")

    assert_contains_in_order(
        body,
        [
            "const { projectFilePath } = resolveProjectFolderPaths(projectPath);",
            'const rawProjectJson = await readFile(projectFilePath, "utf-8");',
            "return this.serializer.deserialize(rawProjectJson);",
        ],
    )
    assert "writeFile" not in body
    assert "ensureProjectFolder" not in body


def test_local_json_repository_save_only_ensures_folder_serializes_and_writes_project_file():
    source = read("storage/src/local/LocalJsonProjectRepository.ts")
    body = extract_block_after(source, "async save(projectPath: string, project: ProjectDto): Promise<void>")

    assert_contains_in_order(
        body,
        [
            "await ensureProjectFolder(projectPath);",
            "const { projectFilePath } = resolveProjectFolderPaths(projectPath);",
            "const projectJson = this.serializer.serialize(project);",
            'await writeFile(projectFilePath, projectJson, "utf-8");',
        ],
    )
    assert "readFile" not in body


def test_normalize_project_name_is_local_filesystem_policy_not_core_rule():
    source = read("storage/src/local/LocalJsonProjectRepository.ts")
    body = extract_block_after(source, "function normalizeProjectName(projectName: string): string")

    assert_contains_in_order(
        body,
        [
            "const trimmedProjectName = projectName.trim();",
            "if (trimmedProjectName.length === 0)",
            'throw new Error("Project name is required.");',
            "return trimmedProjectName",
            r'.replace(/[\\/:*?\"<>|]/g, "-")',
            '.replace(/\\s+/g, "-")',
            ".toLowerCase();",
        ],
    )
