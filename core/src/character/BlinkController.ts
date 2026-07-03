export type BlinkControllerConfig = {
  intervalSeconds?: number;
  closedSeconds?: number;
};

export type BlinkControllerInput = {
  currentTime: number;
  baseEye: string;
};

export class BlinkController {
  private readonly intervalSeconds: number;
  private readonly closedSeconds: number;

  constructor(config: BlinkControllerConfig = {}) {
    this.intervalSeconds = validatePositiveNumber(config.intervalSeconds ?? 4, "Blink intervalSeconds");
    this.closedSeconds = validatePositiveNumber(config.closedSeconds ?? 0.12, "Blink closedSeconds");

    if (this.closedSeconds >= this.intervalSeconds) {
      throw new Error("Blink closedSeconds must be shorter than intervalSeconds.");
    }
  }

  resolve(input: BlinkControllerInput): string {
    const currentTime = validateNonNegativeNumber(input.currentTime, "Blink currentTime");
    const baseEye = normalizeState(input.baseEye, "Blink baseEye");
    const phase = currentTime % this.intervalSeconds;

    return phase >= this.intervalSeconds - this.closedSeconds ? "closed" : baseEye;
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
