from tools.ts_source import read


def test_local_index_exports_storage_tool_parts_by_file_structure():
    source = read("storage/src/local/index.ts")

    assert 'export { LocalJsonProjectRepository } from "./LocalJsonProjectRepository";' in source
    assert 'export { ensureProjectFolder } from "./ProjectFolderInitializer";' in source
    assert 'export { ProjectJsonSerializer } from "./ProjectJsonSerializer";' in source
    assert "PROJECT_FILE_NAME" in source
    assert "PROJECT_FOLDER_NAMES" in source
    assert "resolveProjectFolderPaths" in source
    assert "type ProjectFolderName" in source
    assert "type ProjectFolderPaths" in source
