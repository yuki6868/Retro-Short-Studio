import { CURRENT_PROJECT_SCHEMA_VERSION, type IProjectSerializer, type ProjectDto } from "../../../shared";

export class ProjectJsonSerializer implements IProjectSerializer {
  serialize(project: ProjectDto): string {
    assertProjectDto(project);
    return `${JSON.stringify(project, null, 2)}\n`;
  }

  deserialize(serializedProject: string): ProjectDto {
    const parsedProject: unknown = JSON.parse(serializedProject);
    assertProjectDto(parsedProject);
    return parsedProject;
  }
}

function assertProjectDto(value: unknown): asserts value is ProjectDto {
  assertPlainObject(value, "ProjectDto");

  if (value.schemaVersion !== CURRENT_PROJECT_SCHEMA_VERSION) {
    throw new Error(`ProjectDto.schemaVersion must be ${CURRENT_PROJECT_SCHEMA_VERSION}.`);
  }

  assertNonEmptyString(value.projectId, "ProjectDto.projectId");
  assertNonEmptyString(value.projectName, "ProjectDto.projectName");
  assertProjectSettingsDto(value.settings);
  assertAssetDtos(value.assets);
  assertCharacterDtos(value.characters);
  assertSceneDtos(value.scenes);
}

function assertProjectSettingsDto(value: unknown): void {
  assertPlainObject(value, "ProjectDto.settings");

  assertPositiveInteger(value.width, "ProjectDto.settings.width");
  assertPositiveInteger(value.height, "ProjectDto.settings.height");
  assertPositiveInteger(value.fps, "ProjectDto.settings.fps");
}

function assertAssetDtos(value: unknown): void {
  assertArray(value, "ProjectDto.assets");

  value.forEach((asset, index) => {
    const label = `ProjectDto.assets[${index}]`;
    assertPlainObject(asset, label);
    assertNonEmptyString(asset.assetId, `${label}.assetId`);
    assertNonEmptyString(asset.assetName, `${label}.assetName`);
    assertNonEmptyString(asset.assetType, `${label}.assetType`);
    assertNonEmptyString(asset.assetPath, `${label}.assetPath`);
  });
}

function assertCharacterDtos(value: unknown): void {
  assertArray(value, "ProjectDto.characters");

  value.forEach((character, index) => {
    const label = `ProjectDto.characters[${index}]`;
    assertPlainObject(character, label);
    assertNonEmptyString(character.characterId, `${label}.characterId`);
    assertNonEmptyString(character.characterName, `${label}.characterName`);

    if (character.currentVariant !== undefined) {
      assertCharacterVariantSelectionDto(character.currentVariant, `${label}.currentVariant`);
    }
  });
}

function assertCharacterVariantSelectionDto(value: unknown, label: string): void {
  assertPlainObject(value, label);
  assertNonEmptyString(value.expression, `${label}.expression`);
  assertNonEmptyString(value.eye, `${label}.eye`);
  assertNonEmptyString(value.mouth, `${label}.mouth`);
}

function assertSceneDtos(value: unknown): void {
  assertArray(value, "ProjectDto.scenes");

  value.forEach((scene, sceneIndex) => {
    const label = `ProjectDto.scenes[${sceneIndex}]`;
    assertPlainObject(scene, label);
    assertNonEmptyString(scene.sceneId, `${label}.sceneId`);
    assertNonEmptyString(scene.sceneName, `${label}.sceneName`);
    assertNonNegativeNumber(scene.duration, `${label}.duration`);
    assertNullableString(scene.backgroundAssetId, `${label}.backgroundAssetId`);
    assertStringArray(scene.characterIds, `${label}.characterIds`);
    if (scene.characters !== undefined) {
      assertCharacterInstanceDtos(scene.characters, `${label}.characters`);
    }
    assertActionDtos(scene.actions, `${label}.actions`);
  });
}

function assertCharacterInstanceDtos(value: unknown, label: string): void {
  assertArray(value, label);

  value.forEach((character, index) => {
    const characterLabel = `${label}[${index}]`;
    assertPlainObject(character, characterLabel);
    assertNonEmptyString(character.instanceId, `${characterLabel}.instanceId`);
    assertNonEmptyString(character.characterId, `${characterLabel}.characterId`);
    assertPlainObject(character.transform, `${characterLabel}.transform`);
    assertFiniteNumber(character.transform.x, `${characterLabel}.transform.x`);
    assertFiniteNumber(character.transform.y, `${characterLabel}.transform.y`);
    assertPositiveNumber(character.transform.scale, `${characterLabel}.transform.scale`);
    assertFiniteNumber(character.transform.rotation, `${characterLabel}.transform.rotation`);
    assertNonEmptyString(character.expression, `${characterLabel}.expression`);
    assertNonEmptyString(character.eye, `${characterLabel}.eye`);
    assertNonEmptyString(character.mouth, `${characterLabel}.mouth`);
    assertNonEmptyString(character.motion, `${characterLabel}.motion`);
  });
}

function assertActionDtos(value: unknown, label: string): void {
  assertArray(value, label);

  value.forEach((action, actionIndex) => {
    const actionLabel = `${label}[${actionIndex}]`;
    assertPlainObject(action, actionLabel);
    assertNonEmptyString(action.actionId, `${actionLabel}.actionId`);
    assertNonEmptyString(action.actionType, `${actionLabel}.actionType`);
    assertNonNegativeNumber(action.startTime, `${actionLabel}.startTime`);
    assertNonNegativeNumber(action.endTime, `${actionLabel}.endTime`);
    assertNullableString(action.targetId, `${actionLabel}.targetId`);
    assertPlainObject(action.payload, `${actionLabel}.payload`);

    const startTime = action.startTime;
    const endTime = action.endTime;

    if (typeof startTime === "number" && typeof endTime === "number" && endTime < startTime) {
      throw new Error(`${actionLabel}.endTime must be greater than or equal to startTime.`);
    }

    if (action.actionType === "talk") {
      assertTalkActionPayload(action.payload, `${actionLabel}.payload`);
    }
  });
}

function assertTalkActionPayload(value: Record<string, unknown>, label: string): void {
  assertNonEmptyString(value.text, `${label}.text`);
  assertNonEmptyString(value.speakerId, `${label}.speakerId`);
  assertNonEmptyString(value.speakerCharacterId, `${label}.speakerCharacterId`);
  assertNullableString(value.voiceAssetId, `${label}.voiceAssetId`);
  assertNullableString(value.generatedVoicePath, `${label}.generatedVoicePath`);
  assertNullableNumber(value.generatedVoiceDuration, `${label}.generatedVoiceDuration`);

  if (typeof value.lipSyncEnabled !== "boolean") {
    throw new Error(`${label}.lipSyncEnabled must be a boolean.`);
  }

  if (value.voiceAssetId === null && (value.generatedVoicePath !== null || value.generatedVoiceDuration !== null)) {
    throw new Error(`${label}.generated voice fields require voiceAssetId.`);
  }
}

function assertPlainObject(
  value: unknown,
  label: string,
): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function assertNonEmptyString(value: unknown, label: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function assertNullableString(value: unknown, label: string): void {
  if (value !== null && typeof value !== "string") {
    throw new Error(`${label} must be a string or null.`);
  }

  if (typeof value === "string" && value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string or null.`);
  }
}

function assertPositiveInteger(value: unknown, label: string): void {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
}

function assertNonNegativeNumber(value: unknown, label: string): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative number.`);
  }
}

function assertFiniteNumber(value: unknown, label: string): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }
}

function assertPositiveNumber(value: unknown, label: string): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive number.`);
  }
}

function assertNullableNumber(value: unknown, label: string): void {
  if (value !== null && (typeof value !== "number" || !Number.isFinite(value) || value < 0)) {
    throw new Error(`${label} must be a non-negative number or null.`);
  }
}

function assertArray(value: unknown, label: string): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }
}

function assertStringArray(value: unknown, label: string): void {
  assertArray(value, label);

  value.forEach((item, index) => {
    assertNonEmptyString(item, `${label}[${index}]`);
  });
}
