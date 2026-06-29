import { describe, expect, it } from "vitest";

import { Action, ActionEvaluator, Scene, type ActionPayloadRecord } from "../../core/src";

describe("ActionEvaluator", () => {
  it("returns actions that are active at the current scene time", () => {
    const scene = Scene.create({
      sceneId: "scene-1",
      sceneName: "Opening",
      duration: 10,
      actions: [
        createAction("a-before", "fade", 0, 1),
        createAction("a-talk", "talk", 1, 4, "character-instance-1", { text: "こんにちは" }),
        createAction("a-move", "move", 2, 5, "character-instance-1", { x: 120 }),
        createAction("a-after", "flash", 6, 7),
      ],
    });

    const result = new ActionEvaluator().evaluate(scene, 2.5);

    expect(result.currentTime).toBe(2.5);
    expect(result.activeActions.map((action) => action.actionId)).toEqual(["a-talk", "a-move"]);
  });

  it("treats startTime as inclusive and endTime as exclusive", () => {
    const scene = Scene.create({
      sceneId: "scene-1",
      sceneName: "Opening",
      duration: 10,
      actions: [
        createAction("a-1", "talk", 1, 3),
        createAction("a-2", "talk", 3, 5),
      ],
    });

    expect(new ActionEvaluator().evaluate(scene, 1).activeActions.map((action) => action.actionId)).toEqual(["a-1"]);
    expect(new ActionEvaluator().evaluate(scene, 3).activeActions.map((action) => action.actionId)).toEqual(["a-2"]);
  });

  it("adds elapsed time and normalized progress for renderer-independent interpretation", () => {
    const scene = Scene.create({
      sceneId: "scene-1",
      sceneName: "Opening",
      duration: 10,
      actions: [createAction("a-1", "camera_zoom", 2, 6, null, { zoom: 1.5 })],
    });

    expect(new ActionEvaluator().evaluate(scene, 3).activeActions).toEqual([
      {
        actionId: "a-1",
        actionType: "camera_zoom",
        startTime: 2,
        endTime: 6,
        targetId: null,
        payload: { zoom: 1.5 },
        elapsedTime: 1,
        progress: 0.25,
      },
    ]);
  });

  it("returns copied active action payloads so callers cannot mutate scene actions", () => {
    const scene = Scene.create({
      sceneId: "scene-1",
      sceneName: "Opening",
      duration: 10,
      actions: [createAction("a-1", "talk", 0, 2, "character-instance-1", { nested: { text: "before" } })],
    });

    const result = new ActionEvaluator().evaluate(scene, 1);
    (result.activeActions[0].payload.nested as { text: string }).text = "after";

    expect(new ActionEvaluator().evaluate(scene, 1).activeActions[0].payload).toEqual({
      nested: { text: "before" },
    });
  });

  it("orders active actions deterministically by start time, end time, and id", () => {
    const scene = Scene.create({
      sceneId: "scene-1",
      sceneName: "Opening",
      duration: 10,
      actions: [
        createAction("c", "talk", 1, 5),
        createAction("a", "move", 0, 6),
        createAction("b", "flash", 1, 4),
      ],
    });

    expect(new ActionEvaluator().evaluate(scene, 2).activeActions.map((action) => action.actionId)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("validates evaluation time", () => {
    const scene = Scene.create({ sceneId: "scene-1", sceneName: "Opening", duration: 10 });
    const evaluator = new ActionEvaluator();

    expect(() => evaluator.evaluate(scene, -1)).toThrow("Action evaluation time must be greater than or equal to 0.");
    expect(() => evaluator.evaluate(scene, Number.NaN)).toThrow("Action evaluation time must be a finite number.");
  });
});

function createAction(
  actionId: string,
  actionType: string,
  startTime: number,
  endTime: number,
  targetId: string | null = null,
  payload: ActionPayloadRecord = {},
) {
  return Action.create({
    actionId,
    actionType,
    startTime,
    endTime,
    targetId,
    payload,
  }).toSnapshot();
}
