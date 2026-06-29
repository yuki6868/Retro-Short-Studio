import { describe, expect, it } from "vitest";

import { CharacterImageMap, CharacterModel } from "../../core/src";

describe("Character Image Mapping", () => {
  it("maps character states to character image asset ids without hard-coding filenames", () => {
    const imageMap = CharacterImageMap.empty()
      .setExpressionImage(" happy ", " img-expression-happy ")
      .setEyeImage(" wink ", " img-eye-wink ")
      .setMouthImage(" open ", " img-mouth-open ")
      .setMotionImage(" talking ", " img-motion-talking ");

    expect(imageMap.toSnapshot()).toEqual({
      expression: { happy: "img-expression-happy" },
      eye: { wink: "img-eye-wink" },
      mouth: { open: "img-mouth-open" },
      motion: { talking: "img-motion-talking" },
    });
  });

  it("resolves image asset ids for a separated character state", () => {
    const imageMap = CharacterImageMap.create({
      expression: { neutral: "img-expression-neutral", happy: "img-expression-happy" },
      eye: { open: "img-eye-open" },
      mouth: { closed: "img-mouth-closed", open: "img-mouth-open" },
      motion: { idle: "img-motion-idle" },
    });

    expect(imageMap.resolve({ expression: "happy", eye: "open", mouth: "open", motion: "idle" })).toEqual({
      expressionAssetId: "img-expression-happy",
      eyeAssetId: "img-eye-open",
      mouthAssetId: "img-mouth-open",
      motionAssetId: "img-motion-idle",
    });
  });

  it("returns null for unmapped states instead of guessing an image", () => {
    const imageMap = CharacterImageMap.create({
      expression: { neutral: "img-expression-neutral" },
    });

    expect(imageMap.resolve({ expression: "angry", eye: "open", mouth: "closed", motion: "idle" })).toEqual({
      expressionAssetId: null,
      eyeAssetId: null,
      mouthAssetId: null,
      motionAssetId: null,
    });
  });

  it("keeps CharacterModel state separate from the image map", () => {
    const character = CharacterModel.create({ characterId: "c-1", characterName: "ずんだもん" });

    character.mapExpressionImage("neutral", "img-expression-neutral");
    character.mapEyeImage("open", "img-eye-open");
    character.mapMouthImage("closed", "img-mouth-closed");
    character.mapMotionImage("idle", "img-motion-idle");

    expect(character.resolveDefaultImages()).toEqual({
      expressionAssetId: "img-expression-neutral",
      eyeAssetId: "img-eye-open",
      mouthAssetId: "img-mouth-closed",
      motionAssetId: "img-motion-idle",
    });
    expect(character.toSnapshot()).toEqual({
      characterId: "c-1",
      characterName: "ずんだもん",
      defaultExpression: "neutral",
      defaultEye: "open",
      defaultMouth: "closed",
      defaultMotion: "idle",
      imageMap: {
        expression: { neutral: "img-expression-neutral" },
        eye: { open: "img-eye-open" },
        mouth: { closed: "img-mouth-closed" },
        motion: { idle: "img-motion-idle" },
      },
    });
  });

  it("copies snapshot inputs and outputs", () => {
    const input = {
      expression: { neutral: "img-expression-neutral" },
      eye: {},
      mouth: {},
      motion: {},
    };
    const imageMap = CharacterImageMap.create(input);

    input.expression.neutral = "mutated";
    const output = imageMap.toSnapshot();
    output.expression.neutral = "mutated-output";

    expect(imageMap.toSnapshot()).toEqual({
      expression: { neutral: "img-expression-neutral" },
      eye: {},
      mouth: {},
      motion: {},
    });
  });

  it("rejects invalid state names and asset ids", () => {
    expect(() => CharacterImageMap.empty().setExpressionImage("   ", "img-expression-neutral")).toThrow(
      "ExpressionState is required.",
    );
    expect(() => CharacterImageMap.empty().setEyeImage("open", "   ")).toThrow("AssetId is required.");
  });
});
