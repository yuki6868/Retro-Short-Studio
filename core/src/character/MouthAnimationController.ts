export type MouthAnimationControllerConfig = {
  cycleSeconds?: number;
};

import type { MouthCueSnapshot } from "../lipsync";

export type MouthAnimationControllerInput = {
  currentTime: number;
  baseMouth: string;
  talk?: {
    startTime: number;
    endTime: number;
    mouthCues?: MouthCueSnapshot[];
  } | null;
};

export class MouthAnimationController {
  private readonly cycleSeconds: number;

  constructor(config: MouthAnimationControllerConfig = {}) {
    this.cycleSeconds = validatePositiveNumber(config.cycleSeconds ?? 0.18, "Mouth cycleSeconds");
  }

  resolve(input: MouthAnimationControllerInput): string {
    const currentTime = validateNonNegativeNumber(input.currentTime, "Mouth currentTime");
    const baseMouth = normalizeState(input.baseMouth, "Mouth baseMouth");

    if (input.talk === null || input.talk === undefined) {
      return baseMouth;
    }

    if (currentTime < input.talk.startTime || currentTime >= input.talk.endTime) {
      return baseMouth;
    }

    const elapsed = Math.max(0, currentTime - input.talk.startTime);
    const cue = input.talk.mouthCues?.find((candidate) => elapsed >= candidate.startTime && elapsed < candidate.endTime);

    if (cue !== undefined) {
      return normalizeState(cue.mouth, "MouthCue mouth");
    }

    if (input.talk.mouthCues !== undefined) {
      return baseMouth;
    }

    const phase = Math.floor(elapsed / this.cycleSeconds) % 3;

    if (phase === 0) {
      return "open";
    }

    if (phase === 1) {
      return "half";
    }

    return "closed";
  }
}

function validatePositiveNumber(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be greater than 0.`);
  }

  return value;
}

function validateNonNegativeNumber(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be greater than or equal to 0.`);
  }

  return value;
}

function normalizeState(value: string, name: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new Error(`${name} is required.`);
  }

  return normalized;
}
