import { CharacterInstance, type CharacterInstanceSnapshot, type IdGenerator, type Project, type TransformValues } from "../../../core/src";

export type SceneCharacterPlacementCharacter = CharacterInstanceSnapshot & {
  characterName: string;
};

export type SceneCharacterPlacementState = {
  sceneId: string | null;
  sceneName: string | null;
  availableCharacters: Array<{
    characterId: string;
    characterName: string;
  }>;
  placedCharacters: SceneCharacterPlacementCharacter[];
  selectedInstanceId: string | null;
};

export type AddCharacterInstanceInput = {
  sceneId: string;
  characterId: string;
  transform?: Partial<TransformValues>;
};

export type UpdateCharacterInstanceInput = {
  sceneId: string;
  instanceId: string;
  transform?: Partial<TransformValues>;
  expression?: string;
  eye?: string;
  mouth?: string;
  motion?: string;
};

export type RemoveCharacterInstanceInput = {
  sceneId: string;
  instanceId: string;
};

export type SelectCharacterInstanceInput = {
  sceneId: string;
  instanceId: string | null;
};

export type SceneCharacterPlacementUseCaseConfig = {
  project: Project;
  idGenerator: IdGenerator;
  initialSceneId?: string | null;
};

export class SceneCharacterPlacementUseCase {
  private selectedSceneId: string | null;
  private selectedInstanceId: string | null = null;

  constructor(private readonly config: SceneCharacterPlacementUseCaseConfig) {
    this.selectedSceneId = config.initialSceneId ?? null;
  }

  get state(): SceneCharacterPlacementState {
    return this.createState();
  }

  showScene(sceneId: string | null): SceneCharacterPlacementState {
    this.selectedSceneId = sceneId === null ? null : normalizeId(sceneId, "sceneId");
    this.selectedInstanceId = null;

    if (this.selectedSceneId !== null) {
      this.findSceneOrThrow(this.selectedSceneId);
    }

    return this.createState();
  }

  addCharacterInstance(input: AddCharacterInstanceInput): SceneCharacterPlacementState {
    const sceneId = normalizeId(input.sceneId, "sceneId");
    const characterId = normalizeId(input.characterId, "characterId");
    const character = this.findCharacterOrThrow(characterId);
    const instance = CharacterInstance.create({
      instanceId: this.config.idGenerator.generate("character-instance"),
      characterId,
      transform: normalizeTransform(input.transform),
      expression: character.defaultExpression,
      eye: character.defaultEye,
      mouth: character.defaultMouth,
      motion: character.defaultMotion,
    });

    this.config.project.updateScene(sceneId, (scene) => scene.addCharacterInstance(instance));
    this.selectedSceneId = sceneId;
    this.selectedInstanceId = instance.toSnapshot().instanceId;
    return this.createState();
  }

  updateCharacterInstance(input: UpdateCharacterInstanceInput): SceneCharacterPlacementState {
    const sceneId = normalizeId(input.sceneId, "sceneId");
    const instanceId = normalizeId(input.instanceId, "instanceId");

    this.config.project.updateScene(sceneId, (scene) => {
      scene.updateCharacterInstance(instanceId, (instance) => {
        if (input.transform !== undefined) {
          const current = instance.toSnapshot().transform;
          instance.move(normalizeTransform({ ...current, ...input.transform }));
        }

        instance.changeStates({
          expression: input.expression,
          eye: input.eye,
          mouth: input.mouth,
          motion: input.motion,
        });
      });
    });

    this.selectedSceneId = sceneId;
    this.selectedInstanceId = instanceId;
    return this.createState();
  }

  removeCharacterInstance(input: RemoveCharacterInstanceInput): SceneCharacterPlacementState {
    const sceneId = normalizeId(input.sceneId, "sceneId");
    const instanceId = normalizeId(input.instanceId, "instanceId");

    this.config.project.updateScene(sceneId, (scene) => scene.removeCharacterInstance(instanceId));
    this.selectedSceneId = sceneId;
    this.selectedInstanceId = null;
    return this.createState();
  }

  selectCharacterInstance(input: SelectCharacterInstanceInput): SceneCharacterPlacementState {
    const sceneId = normalizeId(input.sceneId, "sceneId");

    if (input.instanceId !== null) {
      const instanceId = normalizeId(input.instanceId, "instanceId");
      const scene = this.findSceneOrThrow(sceneId);

      if (!scene.characters.some((character) => character.instanceId === instanceId)) {
        throw new Error(`Character instance does not exist in scene ${sceneId}: ${instanceId}.`);
      }

      this.selectedInstanceId = instanceId;
    } else {
      this.selectedInstanceId = null;
    }

    this.selectedSceneId = sceneId;
    return this.createState();
  }

  private createState(): SceneCharacterPlacementState {
    const snapshot = this.config.project.toSnapshot();
    const scene = this.selectedSceneId === null
      ? snapshot.scenes[0] ?? null
      : snapshot.scenes.find((candidate) => candidate.sceneId === this.selectedSceneId) ?? null;
    const characterNameById = new Map(snapshot.characters.map((character) => [character.characterId, character.characterName]));

    return {
      sceneId: scene?.sceneId ?? null,
      sceneName: scene?.sceneName ?? null,
      availableCharacters: snapshot.characters.map((character) => ({
        characterId: character.characterId,
        characterName: character.characterName,
      })),
      placedCharacters: (scene?.characters ?? []).map((character) => ({
        ...character,
        characterName: characterNameById.get(character.characterId) ?? character.characterId,
      })),
      selectedInstanceId: scene?.characters.some((character) => character.instanceId === this.selectedInstanceId)
        ? this.selectedInstanceId
        : null,
    };
  }

  private findSceneOrThrow(sceneId: string) {
    const scene = this.config.project.toSnapshot().scenes.find((candidate) => candidate.sceneId === sceneId);

    if (scene === undefined) {
      throw new Error(`Scene does not exist: ${sceneId}.`);
    }

    return scene;
  }

  private findCharacterOrThrow(characterId: string) {
    const character = this.config.project.toSnapshot().characters.find((candidate) => candidate.characterId === characterId);

    if (character === undefined) {
      throw new Error(`CharacterModel does not exist: ${characterId}.`);
    }

    return character;
  }
}

function normalizeId(value: string, name: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new Error(`SceneCharacterPlacement ${name} is required.`);
  }

  return normalized;
}

function normalizeTransform(transform: Partial<TransformValues> | undefined): TransformValues {
  return {
    x: normalizeNumber(transform?.x ?? 0, "Transform.x"),
    y: normalizeNumber(transform?.y ?? 0, "Transform.y"),
    scale: normalizePositiveNumber(transform?.scale ?? 1, "Transform.scale"),
    rotation: normalizeNumber(transform?.rotation ?? 0, "Transform.rotation"),
  };
}

function normalizeNumber(value: number, name: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number.`);
  }

  return value;
}

function normalizePositiveNumber(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive finite number.`);
  }

  return value;
}
