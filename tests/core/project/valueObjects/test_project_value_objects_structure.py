from tools.ts_source import extract_block_after, read


def test_project_id_trims_rejects_empty_and_supports_equality():
    source = read("core/src/project/valueObjects/ProjectId.ts")

    create_body = extract_block_after(source, "static create(value: string): ProjectId")
    assert "const normalizedValue = value.trim();" in create_body
    assert "if (normalizedValue.length === 0)" in create_body
    assert 'throw new Error("ProjectId is required.");' in create_body
    assert "return new ProjectId(normalizedValue);" in create_body
    assert "equals(other: ProjectId): boolean" in source
    assert "return this.value === other.value;" in source


def test_project_name_trims_and_rejects_empty():
    source = read("core/src/project/valueObjects/ProjectName.ts")

    create_body = extract_block_after(source, "static create(value: string): ProjectName")
    assert "const normalizedValue = value.trim();" in create_body
    assert "if (normalizedValue.length === 0)" in create_body
    assert 'throw new Error("ProjectName is required.");' in create_body
    assert "return new ProjectName(normalizedValue);" in create_body


def test_project_settings_accepts_positive_integers_and_has_vertical_short_default():
    source = read("core/src/project/valueObjects/ProjectSettings.ts")

    assert "width: number;" in source
    assert "height: number;" in source
    assert "fps: number;" in source
    create_body = extract_block_after(source, "static create(values: ProjectSettingsValues): ProjectSettings")
    assert 'assertPositiveInteger(values.width, "Project width");' in create_body
    assert 'assertPositiveInteger(values.height, "Project height");' in create_body
    assert 'assertPositiveInteger(values.fps, "Project fps");' in create_body
    assert "return new ProjectSettings({ ...values });" in create_body
    assert "width: 1080" in source
    assert "height: 1920" in source
    assert "fps: 30" in source
    assert "!Number.isInteger(value) || value <= 0" in source
