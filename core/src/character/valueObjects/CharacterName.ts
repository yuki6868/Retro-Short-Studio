import { assertNonEmptyString } from "../../validation";

export class CharacterName {
  private constructor(private readonly value: string) {}

  static create(value: string): CharacterName {
    return new CharacterName(assertNonEmptyString(value, "CharacterName"));
  }

  toString(): string {
    return this.value;
  }
}
