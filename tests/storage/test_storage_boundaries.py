from tools.ts_source import imports_from, read, ts_files


def test_storage_can_depend_on_shared_but_not_frontend_core_app_or_engine():
    forbidden = ("frontend", "core", "app", "engine")

    for file_path in ts_files("storage/src"):
        imports = imports_from(file_path.read_text(encoding="utf-8"))
        assert not any(any(layer in imported for layer in forbidden) for imported in imports), file_path


def test_storage_root_exports_contracts_and_local_implementation():
    source = read("storage/src/index.ts")

    assert 'export type * from "./contracts";' in source
    assert 'export * from "./local";' in source
