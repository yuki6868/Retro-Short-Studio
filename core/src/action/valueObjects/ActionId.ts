import type { IdGenerator } from "../../identity";
import { assertNonEmptyString } from "../../validation";

export class ActionId {
  private constructor(private readonly value: string) {}

  static create(value: string): ActionId {
    return new ActionId(assertNonEmptyString(value, "ActionId"));
  }

  static generate(generator: IdGenerator): ActionId {
    return ActionId.create(generator.generate("action"));
  }

  toString(): string {
    return this.value;
  }

  equals(other: ActionId): boolean {
    return this.value === other.value;
  }
}
