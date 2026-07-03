import type {
  AssignCharacterImageInput,
  ChangeCharacterDefaultsInput,
  CharacterModelEditorState,
  CreateCharacterModelInput,
  RenameCharacterModelInput,
} from "../../../app/src";

export type CharacterModelEditorUseCase = {
  readonly state: CharacterModelEditorState;
  createCharacterModel(input: CreateCharacterModelInput): CharacterModelEditorState;
  selectCharacter(characterId: string): CharacterModelEditorState;
  renameCharacter(input: RenameCharacterModelInput): CharacterModelEditorState;
  changeDefaults(input: ChangeCharacterDefaultsInput): CharacterModelEditorState;
  assignImage(input: AssignCharacterImageInput): CharacterModelEditorState;
};

export type CharacterImageMapEditorSlotViewState = {
  key: string;
  kind: AssignCharacterImageInput["kind"];
  state: string;
  label: string;
  assetId: string | null;
};

export type CharacterModelEditorCharacterViewState = {
  characterId: string;
  characterName: string;
  selected: boolean;
  defaultExpression: string;
  defaultEye: string;
  defaultMouth: string;
  defaultMotion: string;
  imageSlots: CharacterImageMapEditorSlotViewState[];
};

export type CharacterModelEditorViewState = {
  title: string;
  characters: CharacterModelEditorCharacterViewState[];
  selectedCharacter: CharacterModelEditorCharacterViewState | null;
  characterImageAssets: CharacterModelEditorState["characterImageAssets"];
  emptyText: string;
  createButton: { label: string; disabled: boolean };
};

export type CharacterModelEditorProps = {
  title?: string;
  characters: CharacterModelEditorUseCase;
};

export class CharacterModelEditor {
  private latestState: CharacterModelEditorState;

  constructor(private readonly props: CharacterModelEditorProps) {
    this.latestState = props.characters.state;
  }

  render(): CharacterModelEditorViewState {
    const characters = this.latestState.characters.map(toCharacterViewState);
    const selectedCharacter = characters.find((character) => character.selected) ?? characters[0] ?? null;

    return {
      title: this.props.title ?? "Character Model Editor",
      characters,
      selectedCharacter,
      characterImageAssets: this.latestState.characterImageAssets,
      emptyText: characters.length === 0 ? "Create a CharacterModel before assigning expression images." : "",
      createButton: { label: "Add Character Model", disabled: false },
    };
  }

  create(input: CreateCharacterModelInput): CharacterModelEditorViewState {
    this.latestState = this.props.characters.createCharacterModel(input);
    return this.render();
  }

  select(characterId: string): CharacterModelEditorViewState {
    this.latestState = this.props.characters.selectCharacter(characterId);
    return this.render();
  }

  rename(input: RenameCharacterModelInput): CharacterModelEditorViewState {
    this.latestState = this.props.characters.renameCharacter(input);
    return this.render();
  }

  changeDefaults(input: ChangeCharacterDefaultsInput): CharacterModelEditorViewState {
    this.latestState = this.props.characters.changeDefaults(input);
    return this.render();
  }

  assignImage(input: AssignCharacterImageInput): CharacterModelEditorViewState {
    this.latestState = this.props.characters.assignImage(input);
    return this.render();
  }
}

function toCharacterViewState(character: CharacterModelEditorState["characters"][number]): CharacterModelEditorCharacterViewState {
  return {
    characterId: character.characterId,
    characterName: character.characterName,
    selected: character.selected,
    defaultExpression: character.defaultExpression,
    defaultEye: character.defaultEye,
    defaultMouth: character.defaultMouth,
    defaultMotion: character.defaultMotion,
    imageSlots: [
      { key: "expression:neutral", kind: "expression", state: "neutral", label: "Default expression", assetId: character.imageMap.expression.neutral ?? null },
      { key: "mouth:closed", kind: "mouth", state: "closed", label: "Mouth closed", assetId: character.imageMap.mouth.closed ?? null },
      { key: "mouth:half", kind: "mouth", state: "half", label: "Mouth half", assetId: character.imageMap.mouth.half ?? null },
      { key: "mouth:open", kind: "mouth", state: "open", label: "Mouth open", assetId: character.imageMap.mouth.open ?? null },
      { key: "eye:open", kind: "eye", state: "open", label: "Eye open", assetId: character.imageMap.eye.open ?? null },
      { key: "eye:closed", kind: "eye", state: "closed", label: "Eye closed", assetId: character.imageMap.eye.closed ?? null },
    ],
  };
}
