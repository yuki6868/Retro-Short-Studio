import {
  CharacterId,
  CharacterName,
  ExpressionState,
  EyeState,
  MotionState,
  MouthState,
} from "./valueObjects";

export type CharacterModelSnapshot = {
  characterId: string;
  characterName: string;
  defaultExpression: string;
  defaultEye: string;
  defaultMouth: string;
  defaultMotion: string;
};

export class CharacterModel {
  private constructor(
    private readonly id: CharacterId,
    private name: CharacterName,
    private defaultExpression: ExpressionState,
    private defaultEye: EyeState,
    private defaultMouth: MouthState,
    private defaultMotion: MotionState,
  ) {}

  static create(params: {
    characterId: string;
    characterName: string;
    defaultExpression?: string;
    defaultEye?: string;
    defaultMouth?: string;
    defaultMotion?: string;
  }): CharacterModel {
    return new CharacterModel(
      CharacterId.create(params.characterId),
      CharacterName.create(params.characterName),
      ExpressionState.create(params.defaultExpression),
      EyeState.create(params.defaultEye),
      MouthState.create(params.defaultMouth),
      MotionState.create(params.defaultMotion),
    );
  }

  static restore(snapshot: CharacterModelSnapshot): CharacterModel {
    return CharacterModel.create(snapshot);
  }

  rename(characterName: string): void {
    this.name = CharacterName.create(characterName);
  }

  changeDefaultStates(params: {
    expression?: string;
    eye?: string;
    mouth?: string;
    motion?: string;
  }): void {
    if (params.expression !== undefined) {
      this.defaultExpression = ExpressionState.create(params.expression);
    }
    if (params.eye !== undefined) {
      this.defaultEye = EyeState.create(params.eye);
    }
    if (params.mouth !== undefined) {
      this.defaultMouth = MouthState.create(params.mouth);
    }
    if (params.motion !== undefined) {
      this.defaultMotion = MotionState.create(params.motion);
    }
  }

  toSnapshot(): CharacterModelSnapshot {
    return {
      characterId: this.id.toString(),
      characterName: this.name.toString(),
      defaultExpression: this.defaultExpression.toString(),
      defaultEye: this.defaultEye.toString(),
      defaultMouth: this.defaultMouth.toString(),
      defaultMotion: this.defaultMotion.toString(),
    };
  }
}
