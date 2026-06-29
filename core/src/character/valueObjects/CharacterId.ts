import type { IdGenerator } from "../../identity";
import { assertNonEmptyString } from "../../validation";

export class CharacterId {
  private constructor(private readonly value: string) {}

  static create(value: string): CharacterId {
    return new CharacterId(assertNonEmptyString(value, "CharacterId"));
  }

  static generate(generator: IdGenerator): CharacterId {
    return CharacterId.create(generator.generate("character"));
  }

  toString(): string {
    return this.value;
  }

  equals(other: CharacterId): boolean {
    return this.value === other.value;
  }
}
