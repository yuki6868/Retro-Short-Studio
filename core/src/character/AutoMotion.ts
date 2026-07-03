import type { CharacterVariantSelectionSnapshot } from "./CharacterVariantSelection";

export type AutoMotionType = "blink";

export type AutoMotionDisableConditionSnapshot = {
  expression?: string[];
  eye?: string[];
  mouth?: string[];
};

export type AutoMotionSnapshot = {
  type: AutoMotionType;
  interval: number;
  duration: number;
  randomRange?: number;
  disableCondition?: AutoMotionDisableConditionSnapshot;
};

export type AutoMotionResolveInput = {
  currentTime: number;
  baseSelection: CharacterVariantSelectionSnapshot;
};

export interface AutoMotion {
  readonly type: AutoMotionType;
  resolve(input: AutoMotionResolveInput): Partial<CharacterVariantSelectionSnapshot> | null;
  toSnapshot(): AutoMotionSnapshot;
}

export function shouldDisableAutoMotion(condition: AutoMotionDisableConditionSnapshot | undefined, selection: CharacterVariantSelectionSnapshot): boolean {
  if (condition === undefined) {
    return false;
  }

  return (
    matchesState(condition.expression, selection.expression) ||
    matchesState(condition.eye, selection.eye) ||
    matchesState(condition.mouth, selection.mouth)
  );
}

function matchesState(states: string[] | undefined, value: string): boolean {
  if (states === undefined || states.length === 0) {
    return false;
  }

  return states.map((state) => state.trim()).includes(value.trim());
}

export function validateAutoMotionSeconds(value: number, name: string, options: { allowZero?: boolean } = {}): number {
  if (!Number.isFinite(value) || (options.allowZero === true ? value < 0 : value <= 0)) {
    throw new Error(`${name} must be ${options.allowZero === true ? "greater than or equal to 0" : "greater than 0"}.`);
  }

  return value;
}

export function normalizeAutoMotionState(value: string, name: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new Error(`${name} is required.`);
  }

  return normalized;
}
