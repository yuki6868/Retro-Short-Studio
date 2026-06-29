from tools.ts_source import extract_block_after, read


def test_project_folder_layout_defines_one_project_one_folder_contract():
    source = read("storage/src/local/ProjectFolderLayout.ts")

    assert 'PROJECT_FILE_NAME = "project.rss.json"' in source
    for folder_name in [
        'assets: "assets"',
        'characters: "assets/characters"',
        'backgrounds: "assets/backgrounds"',
        'effects: "assets/effects"',
        'voices: "voices"',
        'renders: "renders"',
        'exports: "exports"',
    ]:
        assert folder_name in source


def test_resolve_project_folder_paths_maps_names_to_paths_without_io():
    source = read("storage/src/local/ProjectFolderLayout.ts")
    body = extract_block_after(source, "export function resolveProjectFolderPaths(projectRootPath: string): ProjectFolderPaths")

    assert "projectFilePath: path.join(projectRootPath, PROJECT_FILE_NAME)" in body
    assert "Object.entries(PROJECT_FOLDER_NAMES).map" in body
    assert "path.join(projectRootPath, folderName)" in body
    assert "mkdir" not in body
    assert "writeFile" not in body
