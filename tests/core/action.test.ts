import { describe, expect, it } from "vitest";

import {
  Action,
  ActionId,
  ActionPayload,
  ActionTargetId,
  ActionTimeRange,
  ActionType,
  DeterministicIdGenerator,
} from "../../core/src";

describe("Action Core", () => {
  it("creates a generic action snapshot for scene time changes", () => {
    const action = Action.create({
      actionId: " a-1 ",
      actionType: " talk ",
      startTime: 0,
      endTime: 2.5,
      targetId: " character-instance-1 ",
      payload: { text: "こんにちは", lipSyncEnabled: true },
    });

    expect(action.toSnapshot()).toEqual({
      actionId: "a-1",
      actionType: "talk",
      startTime: 0,
      endTime: 2.5,
      targetId: "character-instance-1",
      payload: { text: "こんにちは", lipSyncEnabled: true },
    });
  });

  it("supports action id generation through injected generators", () => {
    const generator = new DeterministicIdGenerator();

    expect(ActionId.generate(generator).toString()).toBe("action-1");
  });

  it("keeps ActionType extensible instead of hard-coding only current types", () => {
    expect(ActionType.talk().toString()).toBe("talk");
    expect(ActionType.cameraZoom().isBuiltIn()).toBe(true);
    expect(ActionType.create("shake").isBuiltIn()).toBe(false);
  });

  it("validates action identity, type, time range, target, and payload", () => {
    expect(() => ActionId.create("   ")).toThrow("ActionId is required.");
    expect(() => ActionType.create("   ")).toThrow("ActionType is required.");
    expect(() => ActionTimeRange.create(-1, 1)).toThrow("Action startTime must be greater than or equal to 0.");
    expect(() => ActionTimeRange.create(2, 2)).toThrow("Action endTime must be greater than startTime.");
    expect(() => ActionTimeRange.create(0, Number.POSITIVE_INFINITY)).toThrow("Action endTime must be a finite number.");
    expect(() => ActionTargetId.create("   ")).toThrow("Action targetId must be a non-empty string or null.");
    expect(() => ActionPayload.create([] as never)).toThrow("Action payload must be a plain object.");
  });

  it("can be edited without changing the action identity", () => {
    const action = Action.create({
      actionId: "a-1",
      actionType: "move",
      startTime: 1,
      endTime: 2,
      targetId: "character-instance-1",
      payload: { x: 10 },
    });

    action.changeTimeRange(0, 3);
    action.changeTarget(null);
    action.changeType("custom_bounce");
    action.replacePayload({ intensity: 0.8 });

    expect(action.toSnapshot()).toEqual({
      actionId: "a-1",
      actionType: "custom_bounce",
      startTime: 0,
      endTime: 3,
      targetId: null,
      payload: { intensity: 0.8 },
    });
  });

  it("restores from snapshots without retaining external payload references", () => {
    const snapshot = {
      actionId: "a-1",
      actionType: "talk",
      startTime: 0,
      endTime: 1,
      targetId: "character-instance-1",
      payload: { nested: { text: "before" } },
    };

    const action = Action.restore(snapshot);
    snapshot.payload.nested.text = "after";
    const output = action.toSnapshot();
    (output.payload.nested as { text: string }).text = "mutated";

    expect(action.toSnapshot()).toEqual({
      actionId: "a-1",
      actionType: "talk",
      startTime: 0,
      endTime: 1,
      targetId: "character-instance-1",
      payload: { nested: { text: "before" } },
    });
  });
});
