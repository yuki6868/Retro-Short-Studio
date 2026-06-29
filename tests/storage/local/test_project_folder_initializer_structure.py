from tools.ts_source import assert_contains_in_order, extract_block_after, read


def test_project_folder_initializer_creates_root_and_standard_subfolders_only():
    source = read("storage/src/local/ProjectFolderInitializer.ts")
    body = extract_block_after(source, "export async function ensureProjectFolder(projectRootPath: string): Promise<void>")

    assert 'import { mkdir } from "node:fs/promises";' in source
    assert 'import { resolveProjectFolderPaths } from "./ProjectFolderLayout";' in source
    assert_contains_in_order(
        body,
        [
            "resolveProjectFolderPaths(projectRootPath);",
            "await mkdir(resolvedProjectRootPath, { recursive: true });",
            "await Promise.all(",
            "Object.values(folders).map((folderPath) =>",
            "mkdir(folderPath, { recursive: true }),",
        ],
    )
    assert "JSON.stringify" not in source
    assert "ProjectDto" not in source
