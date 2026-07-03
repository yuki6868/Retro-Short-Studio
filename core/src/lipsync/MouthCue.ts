export type MouthShape = "closed" | "half" | "open" | "wide" | "smile" | "neutral" | string;

export type MouthCueSnapshot = {
  startTime: number;
  endTime: number;
  mouth: MouthShape;
};

export class MouthCue {
  private constructor(private readonly value: MouthCueSnapshot) {}

  static create(params: MouthCueSnapshot): MouthCue {
    const startTime = normalizeTime(params.startTime, "MouthCue startTime");
    const endTime = normalizeTime(params.endTime, "MouthCue endTime");
    const mouth = normalizeMouth(params.mouth);

    if (endTime < startTime) {
      throw new Error("MouthCue endTime must be greater than or equal to startTime.");
    }

    return new MouthCue({ startTime, endTime, mouth });
  }

  static restore(snapshot: MouthCueSnapshot): MouthCue {
    return MouthCue.create(snapshot);
  }

  toSnapshot(): MouthCueSnapshot {
    return { ...this.value };
  }
}

export function normalizeMouthCues(cues: readonly MouthCueSnapshot[] = []): MouthCueSnapshot[] {
  return cues.map((cue) => MouthCue.restore(cue).toSnapshot());
}

export function isMouthCueSnapshot(value: unknown): value is MouthCueSnapshot {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.startTime === "number" &&
    Number.isFinite(candidate.startTime) &&
    candidate.startTime >= 0 &&
    typeof candidate.endTime === "number" &&
    Number.isFinite(candidate.endTime) &&
    candidate.endTime >= candidate.startTime &&
    typeof candidate.mouth === "string" &&
    candidate.mouth.trim().length > 0
  );
}

function normalizeTime(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a non-negative number.`);
  }

  return value;
}

function normalizeMouth(value: string): MouthShape {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new Error("MouthCue mouth is required.");
  }

  return normalized;
}
