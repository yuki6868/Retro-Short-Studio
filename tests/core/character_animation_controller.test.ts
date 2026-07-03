import { describe, expect, it } from "vitest";

import { BlinkController, CharacterAnimationController, MouthAnimationController } from "../../core/src";

describe("CharacterAnimationController", () => {
  it("keeps the base eye outside blink timing", () => {
    const blink = new BlinkController({ intervalSeconds: 4, closedSeconds: 0.12 });

    expect(blink.resolve({ currentTime: 1, baseEye: "open" })).toBe("open");
  });

  it("closes the eye during blink timing", () => {
    const blink = new BlinkController({ intervalSeconds: 4, closedSeconds: 0.12 });

    expect(blink.resolve({ currentTime: 3.95, baseEye: "open" })).toBe("closed");
  });

  it("keeps the base mouth when the character is not talking", () => {
    const mouth = new MouthAnimationController({ cycleSeconds: 0.2 });

    expect(mouth.resolve({ currentTime: 1, baseMouth: "half", talk: null })).toBe("half");
  });

  it("animates the mouth while the character is talking", () => {
    const mouth = new MouthAnimationController({ cycleSeconds: 0.2 });

    expect(mouth.resolve({ currentTime: 1.01, baseMouth: "closed", talk: { startTime: 1, endTime: 2 } })).toBe("open");
    expect(mouth.resolve({ currentTime: 1.21, baseMouth: "closed", talk: { startTime: 1, endTime: 2 } })).toBe("half");
    expect(mouth.resolve({ currentTime: 1.41, baseMouth: "closed", talk: { startTime: 1, endTime: 2 } })).toBe("closed");
  });


  it("uses stored mouth cues instead of cyclic mouth animation when cues are present", () => {
    const mouth = new MouthAnimationController({ cycleSeconds: 0.2 });

    expect(
      mouth.resolve({
        currentTime: 1.15,
        baseMouth: "closed",
        talk: {
          startTime: 1,
          endTime: 2,
          mouthCues: [
            { startTime: 0, endTime: 0.1, mouth: "closed" },
            { startTime: 0.1, endTime: 0.3, mouth: "open" },
          ],
        },
      }),
    ).toBe("open");
  });

  it("keeps the base mouth for voiced Talk Actions when no cue covers the current time", () => {
    const mouth = new MouthAnimationController({ cycleSeconds: 0.2 });

    expect(
      mouth.resolve({
        currentTime: 1.8,
        baseMouth: "closed",
        talk: { startTime: 1, endTime: 2, mouthCues: [{ startTime: 0, endTime: 0.2, mouth: "open" }] },
      }),
    ).toBe("closed");
  });

  it("combines expression, blink eye, and talk mouth into one variant selection", () => {
    const controller = new CharacterAnimationController(
      new BlinkController({ intervalSeconds: 4, closedSeconds: 0.12 }),
      new MouthAnimationController({ cycleSeconds: 0.2 }),
    );

    expect(
      controller.resolve({
        baseSelection: { expression: "happy", eye: "open", mouth: "closed" },
        currentTime: 3.95,
        talk: { startTime: 3, endTime: 5 },
      }),
    ).toEqual({ expression: "happy", eye: "closed", mouth: "half" });
  });
});
