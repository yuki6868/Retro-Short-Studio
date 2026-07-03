import { CharacterModel, type CharacterImageMapSnapshot, type Project } from "../../../core/src";
import type { AssetDto } from "../../../shared";
import type { IdGenerator } from "../../../core/src";

export type CharacterModelEditorCharacterState = {
  characterId: string;
  characterName: string;
  defaultExpression: string;
  defaultEye: string;
  defaultMouth: string;
  defaultMotion: string;
  imageMap: CharacterImageMapSnapshot;
  selected: boolean;
};

export type CharacterModelEditorState = {
  characters: CharacterModelEditorCharacterState[];
  selectedCharacterId: string | null;
  characterImageAssets: AssetDto[];
};

export type CreateCharacterModelInput = {
  characterName: string;
  defaultExpression?: string;
  defaultEye?: string;
  defaultMouth?: string;
  defaultMotion?: string;
};

export type RenameCharacterModelInput = {
  characterId: string;
  characterName: string;
};

export type ChangeCharacterDefaultsInput = {
  characterId: string;
  defaultExpression?: string;
  defaultEye?: string;
  defaultMouth?: string;
  defaultMotion?: string;
};

export type AssignCharacterImageInput = {
  characterId: string;
  kind: keyof CharacterImageMapSnapshot;
  state: string;
  assetId: string;
};

export type CharacterModelEditorUseCaseConfig = {
  project: Project;
  idGenerator: IdGenerator;
};

export class CharacterModelEditorUseCase {
  private selectedCharacterId: string | null = null;

  constructor(private readonly config: CharacterModelEditorUseCaseConfig) {}

  get state(): CharacterModelEditorState {
    return this.createState();
  }

  createCharacterModel(input: CreateCharacterModelInput): CharacterModelEditorState {
    const character = CharacterModel.create({
      characterId: this.config.idGenerator.generate("character"),
      characterName: normalizeText(input.characterName, "characterName"),
      defaultExpression: input.defaultExpression,
      defaultEye: input.defaultEye,
      defaultMouth: input.defaultMouth,
      defaultMotion: input.defaultMotion,
    });

    this.config.project.addCharacterModel(character);
    this.selectedCharacterId = character.toSnapshot().characterId;
    return this.createState();
  }

  selectCharacter(characterId: string): CharacterModelEditorState {
    const normalizedCharacterId = normalizeText(characterId, "characterId");
    this.ensureCharacterExists(normalizedCharacterId);
    this.selectedCharacterId = normalizedCharacterId;
    return this.createState();
  }

  renameCharacter(input: RenameCharacterModelInput): CharacterModelEditorState {
    const characterId = normalizeText(input.characterId, "characterId");
    this.config.project.updateCharacterModel(characterId, (character) => character.rename(input.characterName));
    this.selectedCharacterId = characterId;
    return this.createState();
  }

  changeDefaults(input: ChangeCharacterDefaultsInput): CharacterModelEditorState {
    const characterId = normalizeText(input.characterId, "characterId");
    this.config.project.updateCharacterModel(characterId, (character) =>
      character.changeDefaultStates({
        expression: input.defaultExpression,
        eye: input.defaultEye,
        mouth: input.defaultMouth,
        motion: input.defaultMotion,
      }),
    );
    this.selectedCharacterId = characterId;
    return this.createState();
  }

  assignImage(input: AssignCharacterImageInput): CharacterModelEditorState {
    const characterId = normalizeText(input.characterId, "characterId");
    const state = normalizeText(input.state, "state");
    const assetId = normalizeText(input.assetId, "assetId");
    const asset = this.config.project.toSnapshot().assets.find((candidate) => candidate.assetId === assetId);

    if (asset === undefined) {
      throw new Error(`Asset does not exist: ${assetId}.`);
    }

    if (asset.assetType !== "character_image") {
      throw new Error(`Character image map must reference a character_image asset: ${assetId}.`);
    }

    this.config.project.updateCharacterModel(characterId, (character) => {
      switch (input.kind) {
        case "expression":
          character.mapExpressionImage(state, assetId);
          break;
        case "eye":
          character.mapEyeImage(state, assetId);
          break;
        case "mouth":
          character.mapMouthImage(state, assetId);
          break;
        case "motion":
          character.mapMotionImage(state, assetId);
          break;
      }
    });
    this.selectedCharacterId = characterId;
    return this.createState();
  }

  private createState(): CharacterModelEditorState {
    const snapshot = this.config.project.toSnapshot();
    const selectedCharacterId = snapshot.characters.some((character) => character.characterId === this.selectedCharacterId)
      ? this.selectedCharacterId
      : snapshot.characters[0]?.characterId ?? null;

    return {
      characters: snapshot.characters.map((character) => ({
        characterId: character.characterId,
        characterName: character.characterName,
        defaultExpression: character.defaultExpression,
        defaultEye: character.defaultEye,
        defaultMouth: character.defaultMouth,
        defaultMotion: character.defaultMotion,
        imageMap: character.imageMap ?? { expression: {}, eye: {}, mouth: {}, motion: {} },
        selected: character.characterId === selectedCharacterId,
      })),
      selectedCharacterId,
      characterImageAssets: snapshot.assets
        .filter((asset) => asset.assetType === "character_image")
        .map((asset) => ({
          assetId: asset.assetId,
          assetName: asset.assetName,
          assetType: "character_image",
          assetPath: asset.assetPath,
        })),
    };
  }

  private ensureCharacterExists(characterId: string): void {
    if (!this.config.project.toSnapshot().characters.some((character) => character.characterId === characterId)) {
      throw new Error(`Character does not exist: ${characterId}.`);
    }
  }
}

function normalizeText(value: string, name: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new Error(`CharacterModelEditor ${name} is required.`);
  }

  return normalized;
}
