import {
  CharacterId,
  CharacterInstanceId,
  ExpressionState,
  EyeState,
  MotionState,
  MouthState,
  Transform,
  type TransformValues,
} from "./valueObjects";

export type CharacterInstanceSnapshot = {
  instanceId: string;
  characterId: string;
  transform: TransformValues;
  expression: string;
  eye: string;
  mouth: string;
  motion: string;
};

export class CharacterInstance {
  private constructor(
    private readonly id: CharacterInstanceId,
    private readonly characterId: CharacterId,
    private transform: Transform,
    private expression: ExpressionState,
    private eye: EyeState,
    private mouth: MouthState,
    private motion: MotionState,
  ) {}

  static create(params: {
    instanceId: string;
    characterId: string;
    transform?: TransformValues;
    expression?: string;
    eye?: string;
    mouth?: string;
    motion?: string;
  }): CharacterInstance {
    return new CharacterInstance(
      CharacterInstanceId.create(params.instanceId),
      CharacterId.create(params.characterId),
      params.transform ? Transform.create(params.transform) : Transform.default(),
      ExpressionState.create(params.expression),
      EyeState.create(params.eye),
      MouthState.create(params.mouth),
      MotionState.create(params.motion),
    );
  }

  static restore(snapshot: CharacterInstanceSnapshot): CharacterInstance {
    return CharacterInstance.create(snapshot);
  }

  move(transform: TransformValues): void {
    this.transform = Transform.create(transform);
  }

  changeStates(params: {
    expression?: string;
    eye?: string;
    mouth?: string;
    motion?: string;
  }): void {
    if (params.expression !== undefined) {
      this.expression = ExpressionState.create(params.expression);
    }
    if (params.eye !== undefined) {
      this.eye = EyeState.create(params.eye);
    }
    if (params.mouth !== undefined) {
      this.mouth = MouthState.create(params.mouth);
    }
    if (params.motion !== undefined) {
      this.motion = MotionState.create(params.motion);
    }
  }

  toSnapshot(): CharacterInstanceSnapshot {
    return {
      instanceId: this.id.toString(),
      characterId: this.characterId.toString(),
      transform: this.transform.toValues(),
      expression: this.expression.toString(),
      eye: this.eye.toString(),
      mouth: this.mouth.toString(),
      motion: this.motion.toString(),
    };
  }
}
