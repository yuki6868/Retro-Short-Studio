from tools.ts_source import assert_contains_in_order, extract_block_after, read


def test_project_owns_id_name_settings_and_collections():
    source = read("core/src/project/Project.ts")

    assert "export type ProjectSnapshot" in source
    assert "projectId: string;" in source
    assert "projectName: string;" in source
    assert "settings: ProjectSettingsValues;" in source
    assert "& ProjectCollectionsSnapshot" in source
    assert "private readonly id: ProjectId" in source
    assert "private name: ProjectName" in source
    assert "private settings: ProjectSettings" in source
    assert "private readonly collections: ProjectCollections" in source


def test_project_create_builds_valid_project_with_empty_collections():
    source = read("core/src/project/Project.ts")
    body = source[source.find("return new Project("):source.find("static restore")]

    assert_contains_in_order(
        body,
        [
            "ProjectId.create(params.projectId)",
            "ProjectName.create(params.projectName)",
            "params.settings",
            "ProjectSettings.create(params.settings)",
            "ProjectSettings.defaultVerticalShort()",
            "ProjectCollections.empty()",
        ],
    )


def test_project_restore_rebuilds_value_objects_and_collections_from_snapshot():
    source = read("core/src/project/Project.ts")
    body = extract_block_after(source, "static restore(snapshot: ProjectSnapshot): Project")

    assert_contains_in_order(
        body,
        [
            "ProjectId.create(snapshot.projectId)",
            "ProjectName.create(snapshot.projectName)",
            "ProjectSettings.create(snapshot.settings)",
            "ProjectCollections.fromSnapshot({",
            "scenes: snapshot.scenes",
            "assets: snapshot.assets",
            "characters: snapshot.characters",
        ],
    )


def test_project_mutations_are_named_domain_operations_not_storage_operations():
    source = read("core/src/project/Project.ts")

    assert "rename(projectName: string): void" in source
    assert "changeSettings(settings: ProjectSettingsValues): void" in source
    assert "save(" not in source
    assert "load(" not in source
    assert "JSON.stringify" not in source
    assert "fs/promises" not in source
