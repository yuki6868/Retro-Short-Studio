import { ExpressionState, EyeState, MouthState } from "./valueObjects";

export type CharacterVariantSelectionSnapshot = {
  expression: string;
  eye: string;
  mouth: string;
};

export class CharacterVariantSelection {
  private constructor(private readonly snapshot: CharacterVariantSelectionSnapshot) {}

  static create(snapshot: Partial<CharacterVariantSelectionSnapshot> = {}): CharacterVariantSelection {
    return new CharacterVariantSelection({
      expression: ExpressionState.create(snapshot.expression).toString(),
      eye: EyeState.create(snapshot.eye).toString(),
      mouth: MouthState.create(snapshot.mouth).toString(),
    });
  }

  static restore(snapshot: CharacterVariantSelectionSnapshot): CharacterVariantSelection {
    return CharacterVariantSelection.create(snapshot);
  }

  change(input: Partial<CharacterVariantSelectionSnapshot>): CharacterVariantSelection {
    return CharacterVariantSelection.create({
      ...this.snapshot,
      ...input,
    });
  }

  toSnapshot(): CharacterVariantSelectionSnapshot {
    return { ...this.snapshot };
  }
}
