import { assertNonEmptyString } from "../../validation";

export class ExpressionState {
  private constructor(private readonly value: string) {}

  static create(value = "neutral"): ExpressionState {
    return new ExpressionState(assertNonEmptyString(value, "ExpressionState"));
  }

  toString(): string {
    return this.value;
  }
}

export class EyeState {
  private constructor(private readonly value: string) {}

  static create(value = "open"): EyeState {
    return new EyeState(assertNonEmptyString(value, "EyeState"));
  }

  toString(): string {
    return this.value;
  }
}

export class MouthState {
  private constructor(private readonly value: string) {}

  static create(value = "closed"): MouthState {
    return new MouthState(assertNonEmptyString(value, "MouthState"));
  }

  toString(): string {
    return this.value;
  }
}

export class MotionState {
  private constructor(private readonly value: string) {}

  static create(value = "idle"): MotionState {
    return new MotionState(assertNonEmptyString(value, "MotionState"));
  }

  toString(): string {
    return this.value;
  }
}
