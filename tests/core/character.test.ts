import { describe, expect, it } from "vitest";

import {
  CharacterId,
  CharacterInstance,
  CharacterInstanceId,
  CharacterModel,
  CharacterName,
  ExpressionState,
  EyeState,
  MotionState,
  MouthState,
  Transform,
} from "../../core/src";

describe("Character Model Core", () => {
  it("creates a character model with default separated states", () => {
    const character = CharacterModel.create({
      characterId: " c-1 ",
      characterName: " ずんだもん ",
    });

    expect(character.toSnapshot()).toEqual({
      characterId: "c-1",
      characterName: "ずんだもん",
      defaultExpression: "neutral",
      defaultEye: "open",
      defaultMouth: "closed",
      defaultMotion: "idle",
      imageMap: { expression: {}, eye: {}, mouth: {}, motion: {} },
    });
  });

  it("changes default states without treating the character as one image", () => {
    const character = CharacterModel.create({ characterId: "c-1", characterName: "ずんだもん" });

    character.changeDefaultStates({ expression: "happy", eye: "wink", mouth: "open", motion: "talking" });

    expect(character.toSnapshot()).toEqual({
      characterId: "c-1",
      characterName: "ずんだもん",
      defaultExpression: "happy",
      defaultEye: "wink",
      defaultMouth: "open",
      defaultMotion: "talking",
      imageMap: { expression: {}, eye: {}, mouth: {}, motion: {} },
    });
  });

  it("creates a character instance with transform and current states", () => {
    const instance = CharacterInstance.create({
      instanceId: " ci-1 ",
      characterId: " c-1 ",
      transform: { x: 10, y: 20, scale: 1.5, rotation: -5 },
      expression: "happy",
      eye: "open",
      mouth: "half",
      motion: "idle",
    });

    expect(instance.toSnapshot()).toEqual({
      instanceId: "ci-1",
      characterId: "c-1",
      transform: { x: 10, y: 20, scale: 1.5, rotation: -5 },
      expression: "happy",
      eye: "open",
      mouth: "half",
      motion: "idle",
    });
  });

  it("does not retain external transform references", () => {
    const transform = { x: 10, y: 20, scale: 1, rotation: 0 };
    const instance = CharacterInstance.create({ instanceId: "ci-1", characterId: "c-1", transform });

    transform.x = 999;
    const snapshot = instance.toSnapshot();
    snapshot.transform.y = 999;

    expect(instance.toSnapshot().transform).toEqual({ x: 10, y: 20, scale: 1, rotation: 0 });
  });

  it("keeps the current variant selection separately from default states", () => {
    const character = CharacterModel.create({
      characterId: "c-1",
      characterName: "ずんだもん",
      defaultExpression: "neutral",
      defaultEye: "open",
      defaultMouth: "closed",
    });

    character.changeVariantSelection({ expression: "happy", mouth: "open" });

    expect(character.resolveCurrentVariantSelection()).toEqual({
      expression: "happy",
      eye: "open",
      mouth: "open",
    });
    expect(character.toSnapshot()).toMatchObject({
      defaultExpression: "neutral",
      defaultEye: "open",
      defaultMouth: "closed",
      currentVariant: { expression: "happy", eye: "open", mouth: "open" },
    });
  });

  it("restores the current variant selection from project snapshots", () => {
    const restored = CharacterModel.restore({
      characterId: "c-1",
      characterName: "ずんだもん",
      defaultExpression: "neutral",
      defaultEye: "open",
      defaultMouth: "closed",
      defaultMotion: "idle",
      currentVariant: { expression: "sad", eye: "closed", mouth: "half" },
      imageMap: { expression: {}, eye: {}, mouth: {}, motion: {} },
    });

    expect(restored.resolveCurrentVariantSelection()).toEqual({
      expression: "sad",
      eye: "closed",
      mouth: "half",
    });
    expect(restored.toSnapshot().currentVariant).toEqual({
      expression: "sad",
      eye: "closed",
      mouth: "half",
    });
  });

  it("rejects invalid character values", () => {
    expect(() => CharacterId.create("   ")).toThrow("CharacterId is required.");
    expect(() => CharacterInstanceId.create("   ")).toThrow("CharacterInstanceId is required.");
    expect(() => CharacterName.create("   ")).toThrow("CharacterName is required.");
    expect(() => ExpressionState.create("   ")).toThrow("ExpressionState is required.");
    expect(() => EyeState.create("   ")).toThrow("EyeState is required.");
    expect(() => MouthState.create("   ")).toThrow("MouthState is required.");
    expect(() => MotionState.create("   ")).toThrow("MotionState is required.");
    expect(() => Transform.create({ x: 0, y: 0, scale: 0, rotation: 0 })).toThrow(
      "Transform.scale must be a positive finite number.",
    );
    expect(() => Transform.create({ x: Number.NaN, y: 0, scale: 1, rotation: 0 })).toThrow(
      "Transform.x must be a finite number.",
    );
  });
});
