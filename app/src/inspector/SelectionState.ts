export type SelectionTarget =
  | { type: "none" }
  | { type: "scene"; sceneId: string }
  | { type: "character"; characterId: string }
  | { type: "action"; sceneId: string; actionId: string };

export type SelectionTargetType = SelectionTarget["type"];

export class SelectionState {
  private constructor(private readonly target: SelectionTarget) {}

  static empty(): SelectionState {
    return new SelectionState({ type: "none" });
  }

  static scene(sceneId: string): SelectionState {
    return new SelectionState({ type: "scene", sceneId: normalizeId(sceneId, "sceneId") });
  }

  static character(characterId: string): SelectionState {
    return new SelectionState({ type: "character", characterId: normalizeId(characterId, "characterId") });
  }

  static action(sceneId: string, actionId: string): SelectionState {
    return new SelectionState({
      type: "action",
      sceneId: normalizeId(sceneId, "sceneId"),
      actionId: normalizeId(actionId, "actionId"),
    });
  }

  get type(): SelectionTargetType {
    return this.target.type;
  }

  toTarget(): SelectionTarget {
    return { ...this.target };
  }
}

function normalizeId(value: string, name: string): string {
  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    throw new Error(`Selection ${name} is required.`);
  }

  return normalizedValue;
}
