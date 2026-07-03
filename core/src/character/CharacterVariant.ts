import { ExpressionState, EyeState, MotionState, MouthState } from "./valueObjects";

export type CharacterVariantSnapshot = {
  expression: string;
  eye: string;
  mouth: string;
  motion: string;
};

export class CharacterVariant {
  private constructor(private readonly snapshot: CharacterVariantSnapshot) {}

  static create(snapshot: Partial<CharacterVariantSnapshot> = {}): CharacterVariant {
    return new CharacterVariant({
      expression: ExpressionState.create(snapshot.expression).toString(),
      eye: EyeState.create(snapshot.eye).toString(),
      mouth: MouthState.create(snapshot.mouth).toString(),
      motion: MotionState.create(snapshot.motion).toString(),
    });
  }

  static fromStateValues(snapshot: CharacterVariantSnapshot): CharacterVariant {
    return CharacterVariant.create(snapshot);
  }

  toKey(): string {
    return [
      `expression=${this.snapshot.expression}`,
      `eye=${this.snapshot.eye}`,
      `mouth=${this.snapshot.mouth}`,
      `motion=${this.snapshot.motion}`,
    ].join("|");
  }

  toSnapshot(): CharacterVariantSnapshot {
    return { ...this.snapshot };
  }
}
