from tools.ts_source import imports_from, read, ts_files


def test_shared_does_not_import_any_runtime_layer():
    forbidden = ("frontend", "core", "app", "engine", "storage")

    for file_path in ts_files("shared"):
        imports = imports_from(file_path.read_text(encoding="utf-8"))
        assert not any(any(layer in imported for layer in forbidden) for imported in imports), file_path


def test_shared_root_exports_contracts_and_dto_only():
    source = read("shared/index.ts")

    assert 'export type * from "./contracts";' in source
    assert 'export type * from "./dto";' in source
    assert "core" not in source
    assert "storage" not in source
