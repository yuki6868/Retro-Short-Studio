import type { MouthCueSnapshot } from "../lipsync";
import type { AutoMotionSnapshot } from "./AutoMotion";
import { BlinkController } from "./BlinkController";
import { CharacterVariantSelection, type CharacterVariantSelectionSnapshot } from "./CharacterVariantSelection";
import { MouthAnimationController } from "./MouthAnimationController";

export type CharacterAnimationControllerInput = {
  baseSelection: CharacterVariantSelectionSnapshot;
  currentTime: number;
  talk?: {
    startTime: number;
    endTime: number;
    mouthCues?: MouthCueSnapshot[];
  } | null;
  autoMotions?: AutoMotionSnapshot[];
};

export class CharacterAnimationController {
  constructor(
    private readonly blinkController = new BlinkController(),
    private readonly mouthController = new MouthAnimationController(),
  ) {}

  resolve(input: CharacterAnimationControllerInput): CharacterVariantSelectionSnapshot {
    const baseSelection = CharacterVariantSelection.restore(input.baseSelection).toSnapshot();

    return CharacterVariantSelection.create({
      expression: baseSelection.expression,
      eye: this.blinkController.resolve({
        currentTime: input.currentTime,
        baseEye: baseSelection.eye,
        baseSelection,
        motions: input.autoMotions,
      }),
      mouth: this.mouthController.resolve({
        currentTime: input.currentTime,
        baseMouth: baseSelection.mouth,
        talk: input.talk ?? null,
      }),
    }).toSnapshot();
  }
}
