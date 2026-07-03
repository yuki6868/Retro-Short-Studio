import { Action, type ActionSnapshot } from "./Action";
import type { ActionPayloadRecord, ActionPayloadValue } from "./valueObjects";

export type CameraEasing = "linear" | "ease_in" | "ease_out" | "ease_in_out";
export type CameraActionType = "camera_zoom" | "camera_move";

export type CameraStateSnapshot = {
  x: number;
  y: number;
  zoom: number;
};

export type CameraActionPayload = ActionPayloadRecord & {
  easing: CameraEasing;
};

export type CameraZoomActionPayload = CameraActionPayload & {
  fromZoom: number;
  toZoom: number;
};

export type CameraMoveActionPayload = CameraActionPayload & {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
};

export type CameraZoomActionSnapshot = Omit<ActionSnapshot, "actionType" | "targetId" | "payload"> & {
  actionType: "camera_zoom";
  targetId: null;
  payload: CameraZoomActionPayload;
};

export type CameraMoveActionSnapshot = Omit<ActionSnapshot, "actionType" | "targetId" | "payload"> & {
  actionType: "camera_move";
  targetId: null;
  payload: CameraMoveActionPayload;
};

export type CameraActionSnapshot = CameraZoomActionSnapshot | CameraMoveActionSnapshot;

export class CameraZoomAction {
  private constructor(private readonly action: Action) {}

  static create(params: {
    actionId: string;
    startTime: number;
    endTime: number;
    fromZoom?: number;
    toZoom?: number;
    zoom?: number;
    easing?: CameraEasing;
  }): CameraZoomAction {
    return new CameraZoomAction(
      Action.create({
        actionId: params.actionId,
        actionType: "camera_zoom",
        startTime: params.startTime,
        endTime: params.endTime,
        targetId: null,
        payload: createCameraZoomPayload(params),
      }),
    );
  }

  static restore(snapshot: CameraZoomActionSnapshot): CameraZoomAction {
    return CameraZoomAction.create({
      actionId: snapshot.actionId,
      startTime: snapshot.startTime,
      endTime: snapshot.endTime,
      fromZoom: snapshot.payload.fromZoom,
      toZoom: snapshot.payload.toZoom,
      easing: snapshot.payload.easing,
    });
  }

  toAction(): Action {
    return Action.restore(this.action.toSnapshot());
  }

  toSnapshot(): CameraZoomActionSnapshot {
    const snapshot = this.action.toSnapshot();
    if (!isCameraZoomActionSnapshot(snapshot)) {
      throw new Error("Action snapshot is not a CameraZoomAction.");
    }
    return snapshot;
  }
}

export class CameraMoveAction {
  private constructor(private readonly action: Action) {}

  static create(params: {
    actionId: string;
    startTime: number;
    endTime: number;
    fromX?: number;
    fromY?: number;
    toX?: number;
    toY?: number;
    x?: number;
    y?: number;
    easing?: CameraEasing;
  }): CameraMoveAction {
    return new CameraMoveAction(
      Action.create({
        actionId: params.actionId,
        actionType: "camera_move",
        startTime: params.startTime,
        endTime: params.endTime,
        targetId: null,
        payload: createCameraMovePayload(params),
      }),
    );
  }

  static restore(snapshot: CameraMoveActionSnapshot): CameraMoveAction {
    return CameraMoveAction.create({
      actionId: snapshot.actionId,
      startTime: snapshot.startTime,
      endTime: snapshot.endTime,
      fromX: snapshot.payload.fromX,
      fromY: snapshot.payload.fromY,
      toX: snapshot.payload.toX,
      toY: snapshot.payload.toY,
      easing: snapshot.payload.easing,
    });
  }

  toAction(): Action {
    return Action.restore(this.action.toSnapshot());
  }

  toSnapshot(): CameraMoveActionSnapshot {
    const snapshot = this.action.toSnapshot();
    if (!isCameraMoveActionSnapshot(snapshot)) {
      throw new Error("Action snapshot is not a CameraMoveAction.");
    }
    return snapshot;
  }
}

export function createCameraZoomPayload(params: ActionPayloadRecord & {
  fromZoom?: number;
  toZoom?: number;
  zoom?: number;
  easing?: CameraEasing;
}): CameraZoomActionPayload {
  const fromZoom = readPositiveNumber(params.fromZoom, 1);
  const toZoom = readPositiveNumber(params.toZoom ?? params.zoom, 1);

  return {
    ...params,
    fromZoom,
    toZoom,
    easing: normalizeEasing(params.easing),
  };
}

export function createCameraMovePayload(params: ActionPayloadRecord & {
  fromX?: number;
  fromY?: number;
  toX?: number;
  toY?: number;
  x?: number;
  y?: number;
  easing?: CameraEasing;
}): CameraMoveActionPayload {
  return {
    ...params,
    fromX: readFiniteNumber(params.fromX, 0),
    fromY: readFiniteNumber(params.fromY, 0),
    toX: readFiniteNumber(params.toX ?? params.x, 0),
    toY: readFiniteNumber(params.toY ?? params.y, 0),
    easing: normalizeEasing(params.easing),
  };
}

export function isCameraActionSnapshot(snapshot: ActionSnapshot): snapshot is CameraActionSnapshot {
  return isCameraZoomActionSnapshot(snapshot) || isCameraMoveActionSnapshot(snapshot);
}

export function isCameraZoomActionSnapshot(snapshot: ActionSnapshot): snapshot is CameraZoomActionSnapshot {
  return snapshot.actionType === "camera_zoom" && snapshot.targetId === null && isCameraZoomPayload(snapshot.payload);
}

export function isCameraMoveActionSnapshot(snapshot: ActionSnapshot): snapshot is CameraMoveActionSnapshot {
  return snapshot.actionType === "camera_move" && snapshot.targetId === null && isCameraMovePayload(snapshot.payload);
}

function isCameraZoomPayload(payload: ActionPayloadRecord): payload is CameraZoomActionPayload {
  return isFiniteNumber(payload.fromZoom) && payload.fromZoom > 0 && isFiniteNumber(payload.toZoom) && payload.toZoom > 0 && isCameraEasing(payload.easing);
}

function isCameraMovePayload(payload: ActionPayloadRecord): payload is CameraMoveActionPayload {
  return isFiniteNumber(payload.fromX) && isFiniteNumber(payload.fromY) && isFiniteNumber(payload.toX) && isFiniteNumber(payload.toY) && isCameraEasing(payload.easing);
}

export function applyCameraEasing(progress: number, easing: CameraEasing = "linear"): number {
  const t = Math.min(Math.max(progress, 0), 1);

  if (easing === "ease_in") {
    return t * t;
  }

  if (easing === "ease_out") {
    return 1 - (1 - t) * (1 - t);
  }

  if (easing === "ease_in_out") {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  return t;
}

export function interpolateCameraState(input: {
  base: CameraStateSnapshot;
  action: ActionSnapshot & { progress: number };
}): CameraStateSnapshot {
  if (input.action.actionType === "camera_zoom") {
    const payload = createCameraZoomPayload(input.action.payload);
    const progress = applyCameraEasing(input.action.progress, payload.easing);
    return {
      ...input.base,
      zoom: interpolate(payload.fromZoom, payload.toZoom, progress),
    };
  }

  if (input.action.actionType === "camera_move") {
    const payload = createCameraMovePayload(input.action.payload);
    const progress = applyCameraEasing(input.action.progress, payload.easing);
    return {
      ...input.base,
      x: interpolate(payload.fromX, payload.toX, progress),
      y: interpolate(payload.fromY, payload.toY, progress),
    };
  }

  return input.base;
}

function interpolate(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

function normalizeEasing(value: ActionPayloadValue | undefined): CameraEasing {
  return isCameraEasing(value) ? value : "linear";
}

function isCameraEasing(value: ActionPayloadValue | undefined): value is CameraEasing {
  return value === "linear" || value === "ease_in" || value === "ease_out" || value === "ease_in_out";
}

function readFiniteNumber(value: ActionPayloadValue | undefined, fallback: number): number {
  return isFiniteNumber(value) ? value : fallback;
}

function readPositiveNumber(value: ActionPayloadValue | undefined, fallback: number): number {
  return isFiniteNumber(value) && value > 0 ? value : fallback;
}

function isFiniteNumber(value: ActionPayloadValue | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
