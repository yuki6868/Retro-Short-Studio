import type { AutoMotionSnapshot } from "./AutoMotion";
import { BlinkMotion } from "./BlinkMotion";
import type { CharacterVariantSelectionSnapshot } from "./CharacterVariantSelection";

export type BlinkControllerConfig = {
  intervalSeconds?: number;
  closedSeconds?: number;
  randomRangeSeconds?: number;
  disableCondition?: AutoMotionSnapshot["disableCondition"];
};

export type BlinkControllerInput = {
  currentTime: number;
  baseEye: string;
  baseSelection?: CharacterVariantSelectionSnapshot;
  motions?: AutoMotionSnapshot[];
};

export class BlinkController {
  private readonly defaultMotion: BlinkMotion;

  constructor(config: BlinkControllerConfig = {}) {
    this.defaultMotion = new BlinkMotion({
      interval: config.intervalSeconds ?? 4,
      duration: config.closedSeconds ?? 0.12,
      randomRange: config.randomRangeSeconds ?? 0,
      disableCondition: config.disableCondition,
    });
  }

  resolve(input: BlinkControllerInput): string {
    const baseSelection = input.baseSelection ?? {
      expression: "neutral",
      eye: input.baseEye,
      mouth: "closed",
    };
    const motions = input.motions === undefined ? [this.defaultMotion] : restoreBlinkMotions(input.motions);

    if (motions.length === 0) {
      return input.baseEye;
    }

    const blink = motions[0]?.resolve({
      currentTime: input.currentTime,
      baseSelection,
    });

    return blink?.eye ?? input.baseEye;
  }
}

function restoreBlinkMotions(motions: AutoMotionSnapshot[]): BlinkMotion[] {
  return motions.filter((motion) => motion.type === "blink").map((motion) => BlinkMotion.restore(motion));
}
