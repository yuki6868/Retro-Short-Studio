from tools.ts_source import assert_contains_in_order, extract_block_after, read


def test_project_collections_snapshot_contains_scene_asset_character_refs_only():
    source = read("core/src/project/collections/ProjectCollections.ts")

    assert "export type ProjectSceneRef" in source
    assert "sceneId: string;" in source
    assert "export type ProjectAssetRef" in source
    assert "assetId: string;" in source
    assert "export type ProjectCharacterRef" in source
    assert "characterId: string;" in source
    assert "scenes: ProjectSceneRef[];" in source
    assert "assets: ProjectAssetRef[];" in source
    assert "characters: ProjectCharacterRef[];" in source


def test_project_collections_empty_starts_with_empty_arrays():
    source = read("core/src/project/collections/ProjectCollections.ts")
    body = extract_block_after(source, "static empty(): ProjectCollections")

    assert "return new ProjectCollections([], [], []);" in body


def test_project_collections_restore_and_snapshot_copy_refs_without_sharing_arrays():
    source = read("core/src/project/collections/ProjectCollections.ts")

    restore_body = extract_block_after(source, "static fromSnapshot(snapshot: ProjectCollectionsSnapshot): ProjectCollections")
    assert_contains_in_order(
        restore_body,
        [
            "snapshot.scenes.map((scene) => ({ ...scene }))",
            "snapshot.assets.map((asset) => ({ ...asset }))",
            "snapshot.characters.map((character) => ({ ...character }))",
        ],
    )

    snapshot_body = extract_block_after(source, "toSnapshot(): ProjectCollectionsSnapshot")
    assert_contains_in_order(
        snapshot_body,
        [
            "scenes: this.scenes.map((scene) => ({ ...scene }))",
            "assets: this.assets.map((asset) => ({ ...asset }))",
            "characters: this.characters.map((character) => ({ ...character }))",
        ],
    )
