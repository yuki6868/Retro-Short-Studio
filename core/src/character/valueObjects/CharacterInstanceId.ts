import type { IdGenerator } from "../../identity";
import { assertNonEmptyString } from "../../validation";

export class CharacterInstanceId {
  private constructor(private readonly value: string) {}

  static create(value: string): CharacterInstanceId {
    return new CharacterInstanceId(assertNonEmptyString(value, "CharacterInstanceId"));
  }

  static generate(generator: IdGenerator): CharacterInstanceId {
    return CharacterInstanceId.create(generator.generate("character-instance"));
  }

  toString(): string {
    return this.value;
  }

  equals(other: CharacterInstanceId): boolean {
    return this.value === other.value;
  }
}
