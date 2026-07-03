import type { AutoMotion, AutoMotionDisableConditionSnapshot, AutoMotionResolveInput, AutoMotionSnapshot } from "./AutoMotion";
import { normalizeAutoMotionState, shouldDisableAutoMotion, validateAutoMotionSeconds } from "./AutoMotion";

export type BlinkMotionConfig = {
  interval: number;
  duration: number;
  randomRange?: number;
  disableCondition?: AutoMotionDisableConditionSnapshot;
};

export class BlinkMotion implements AutoMotion {
  readonly type = "blink" as const;
  private readonly interval: number;
  private readonly duration: number;
  private readonly randomRange: number;
  private readonly disableCondition: AutoMotionDisableConditionSnapshot | undefined;

  constructor(config: BlinkMotionConfig) {
    this.interval = validateAutoMotionSeconds(config.interval, "BlinkMotion interval");
    this.duration = validateAutoMotionSeconds(config.duration, "BlinkMotion duration");
    this.randomRange = validateAutoMotionSeconds(config.randomRange ?? 0, "BlinkMotion randomRange", { allowZero: true });
    this.disableCondition = config.disableCondition;

    if (this.duration >= this.interval) {
      throw new Error("BlinkMotion duration must be shorter than interval.");
    }
  }

  static restore(snapshot: AutoMotionSnapshot): BlinkMotion {
    if (snapshot.type !== "blink") {
      throw new Error(`Unsupported AutoMotion type: ${snapshot.type}`);
    }

    return new BlinkMotion({
      interval: snapshot.interval,
      duration: snapshot.duration,
      randomRange: snapshot.randomRange,
      disableCondition: snapshot.disableCondition,
    });
  }

  resolve(input: AutoMotionResolveInput): { eye: string } | null {
    const currentTime = validateAutoMotionSeconds(input.currentTime, "BlinkMotion currentTime", { allowZero: true });
    const baseEye = normalizeAutoMotionState(input.baseSelection.eye, "BlinkMotion base eye");

    if (shouldDisableAutoMotion(this.disableCondition, input.baseSelection)) {
      return null;
    }

    const cycleIndex = Math.floor(currentTime / this.interval);
    const cycleStart = cycleIndex * this.interval;
    const blinkStart = cycleStart + this.interval - this.duration + this.resolveDeterministicOffset(cycleIndex);
    const blinkEnd = blinkStart + this.duration;

    return currentTime >= blinkStart && currentTime < blinkEnd ? { eye: "closed" } : { eye: baseEye };
  }

  toSnapshot(): AutoMotionSnapshot {
    return {
      type: "blink",
      interval: this.interval,
      duration: this.duration,
      ...(this.randomRange === 0 ? {} : { randomRange: this.randomRange }),
      ...(this.disableCondition === undefined ? {} : { disableCondition: copyDisableCondition(this.disableCondition) }),
    };
  }

  private resolveDeterministicOffset(cycleIndex: number): number {
    if (this.randomRange === 0) {
      return 0;
    }

    const normalized = deterministicUnit(cycleIndex);
    const offset = (normalized * 2 - 1) * this.randomRange;
    const minOffset = -(this.interval - this.duration);
    return Math.min(this.duration, Math.max(minOffset, offset));
  }
}

function deterministicUnit(seed: number): number {
  const value = Math.sin((seed + 1) * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function copyDisableCondition(condition: AutoMotionDisableConditionSnapshot): AutoMotionDisableConditionSnapshot {
  return {
    ...(condition.expression === undefined ? {} : { expression: [...condition.expression] }),
    ...(condition.eye === undefined ? {} : { eye: [...condition.eye] }),
    ...(condition.mouth === undefined ? {} : { mouth: [...condition.mouth] }),
  };
}
