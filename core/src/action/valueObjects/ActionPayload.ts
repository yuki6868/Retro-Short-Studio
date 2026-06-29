export type ActionPayloadValue = string | number | boolean | null | ActionPayloadValue[] | { [key: string]: ActionPayloadValue };
export type ActionPayloadRecord = Record<string, ActionPayloadValue>;

export class ActionPayload {
  private constructor(private readonly value: ActionPayloadRecord) {}

  static create(value: ActionPayloadRecord = {}): ActionPayload {
    if (!isPlainObject(value)) {
      throw new Error("Action payload must be a plain object.");
    }

    return new ActionPayload(deepCopy(value));
  }

  toRecord(): ActionPayloadRecord {
    return deepCopy(this.value);
  }
}

function isPlainObject(value: unknown): value is ActionPayloadRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepCopy<T extends ActionPayloadValue | ActionPayloadRecord>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
