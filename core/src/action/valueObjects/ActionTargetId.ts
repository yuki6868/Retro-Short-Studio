export class ActionTargetId {
  private constructor(private readonly value: string | null) {}

  static create(value: string | null | undefined): ActionTargetId {
    if (value === null || value === undefined) {
      return new ActionTargetId(null);
    }

    const normalizedValue = value.trim();

    if (normalizedValue.length === 0) {
      throw new Error("Action targetId must be a non-empty string or null.");
    }

    return new ActionTargetId(normalizedValue);
  }

  toStringOrNull(): string | null {
    return this.value;
  }
}
