import type { Scene } from "../scene";
import type { ActionSnapshot } from "./Action";

export type ActiveAction = ActionSnapshot & {
  elapsedTime: number;
  progress: number;
};

export type ActionResult = {
  currentTime: number;
  activeActions: ActiveAction[];
};

export class ActionEvaluator {
  evaluate(scene: Scene, time: number): ActionResult {
    const currentTime = normalizeEvaluationTime(time);
    const activeActions = scene
      .toSnapshot()
      .actions.filter((action) => isActiveAt(action, currentTime))
      .sort(compareActiveActions)
      .map((action) => toActiveAction(action, currentTime));

    return {
      currentTime,
      activeActions,
    };
  }
}

function normalizeEvaluationTime(time: number): number {
  if (!Number.isFinite(time)) {
    throw new Error("Action evaluation time must be a finite number.");
  }

  if (time < 0) {
    throw new Error("Action evaluation time must be greater than or equal to 0.");
  }

  return time;
}

function isActiveAt(action: ActionSnapshot, currentTime: number): boolean {
  return action.startTime <= currentTime && currentTime < action.endTime;
}

function compareActiveActions(left: ActionSnapshot, right: ActionSnapshot): number {
  if (left.startTime !== right.startTime) {
    return left.startTime - right.startTime;
  }

  if (left.endTime !== right.endTime) {
    return left.endTime - right.endTime;
  }

  return left.actionId.localeCompare(right.actionId);
}

function toActiveAction(action: ActionSnapshot, currentTime: number): ActiveAction {
  const duration = action.endTime - action.startTime;
  const elapsedTime = currentTime - action.startTime;

  return {
    ...copyActionSnapshot(action),
    elapsedTime,
    progress: duration === 0 ? 1 : elapsedTime / duration,
  };
}

function copyActionSnapshot(action: ActionSnapshot): ActionSnapshot {
  return {
    ...action,
    payload: deepCopyPayload(action.payload),
  };
}

function deepCopyPayload<T>(payload: T): T {
  return JSON.parse(JSON.stringify(payload)) as T;
}
