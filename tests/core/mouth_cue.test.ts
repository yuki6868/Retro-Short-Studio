import { describe, expect, it } from "vitest";

import { MouthCue, normalizeMouthCues } from "../../core/src";

describe("MouthCue", () => {
  it("normalizes a mouth cue without depending on an audio analysis strategy", () => {
    expect(
      MouthCue.create({
        startTime: 0,
        endTime: 0.12,
        mouth: " open ",
      }).toSnapshot(),
    ).toEqual({
      startTime: 0,
      endTime: 0.12,
      mouth: "open",
    });
  });

  it("rejects invalid cue timing", () => {
    expect(() => MouthCue.create({ startTime: 1, endTime: 0.5, mouth: "closed" })).toThrow(
      "MouthCue endTime must be greater than or equal to startTime.",
    );
  });

  it("deep-copies normalized cues", () => {
    const cues = [{ startTime: 0, endTime: 0.1, mouth: "half" }];
    const normalized = normalizeMouthCues(cues);

    cues[0].mouth = "open";

    expect(normalized).toEqual([{ startTime: 0, endTime: 0.1, mouth: "half" }]);
  });
});
