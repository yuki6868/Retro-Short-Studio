from tools.ts_source import imports_from, ts_files


def test_core_does_not_import_outer_layers_or_shared_contracts():
    forbidden = ("frontend", "app", "engine", "storage", "shared")

    for file_path in ts_files("core/src"):
        imports = imports_from(file_path.read_text(encoding="utf-8"))
        assert not any(any(layer in imported for layer in forbidden) for imported in imports), file_path


def test_core_entrypoint_exports_project_world_only():
    source = ts_files("core/src")[0].parents[0].joinpath("index.ts").read_text(encoding="utf-8")

    assert 'export * from "./project";' in source
    assert "storage" not in source
    assert "engine" not in source
