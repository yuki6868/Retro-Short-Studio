import { Action, type ActionSnapshot } from "./Action";
import type { ActionPayloadRecord, ActionPayloadValue } from "./valueObjects";

export type EffectActionType = "fade_in" | "fade_out" | "flash";

export type EffectActionPayload = ActionPayloadRecord & {
  effectType: EffectActionType;
  alpha: number;
  intensity: number;
};

export type EffectActionSnapshot = Omit<ActionSnapshot, "actionType" | "targetId" | "payload"> & {
  actionType: "effect";
  targetId: null;
  payload: EffectActionPayload;
};

export class EffectAction {
  private constructor(private readonly action: Action) {}

  static create(params: {
    actionId: string;
    startTime: number;
    endTime: number;
    effectType: EffectActionType;
    alpha?: number;
    intensity?: number;
  }): EffectAction {
    const payload = createEffectActionPayload({
      effectType: params.effectType,
      alpha: params.alpha ?? defaultAlpha(params.effectType),
      intensity: params.intensity ?? defaultIntensity(params.effectType),
    });

    return new EffectAction(
      Action.create({
        actionId: params.actionId,
        actionType: "effect",
        startTime: params.startTime,
        endTime: params.endTime,
        targetId: null,
        payload,
      }),
    );
  }

  static restore(snapshot: EffectActionSnapshot): EffectAction {
    return EffectAction.create({
      actionId: snapshot.actionId,
      startTime: snapshot.startTime,
      endTime: snapshot.endTime,
      effectType: snapshot.payload.effectType,
      alpha: snapshot.payload.alpha,
      intensity: snapshot.payload.intensity,
    });
  }

  static fromAction(action: Action): EffectAction {
    const snapshot = action.toSnapshot();
    const effectType = resolveEffectType(snapshot.actionType, snapshot.payload.effectType ?? snapshot.payload.kind ?? snapshot.payload.type);

    if (effectType === null) {
      throw new Error("Action snapshot is not an EffectAction.");
    }

    return EffectAction.restore({
      ...snapshot,
      actionType: "effect",
      targetId: null,
      payload: createEffectActionPayload({
        ...snapshot.payload,
        effectType,
        alpha: readNumber(snapshot.payload.alpha, defaultAlpha(effectType)),
        intensity: readNumber(snapshot.payload.intensity, defaultIntensity(effectType)),
      }),
    });
  }

  toAction(): Action {
    return Action.restore(this.action.toSnapshot());
  }

  toSnapshot(): EffectActionSnapshot {
    const snapshot = this.action.toSnapshot();

    if (!isEffectActionSnapshot(snapshot)) {
      throw new Error("Action snapshot is not an EffectAction.");
    }

    return snapshot;
  }
}

export function isEffectActionSnapshot(snapshot: ActionSnapshot): snapshot is EffectActionSnapshot {
  return snapshot.actionType === "effect" && snapshot.targetId === null && isEffectActionPayload(snapshot.payload);
}

export function isEffectActionPayload(payload: ActionPayloadRecord): payload is EffectActionPayload {
  return isEffectActionType(payload.effectType) && isFiniteNumber(payload.alpha) && isFiniteNumber(payload.intensity);
}

export function createEffectActionPayload(params: ActionPayloadRecord & {
  effectType: EffectActionType;
  alpha?: number;
  intensity?: number;
}): EffectActionPayload {
  const alpha = clamp01(params.alpha ?? defaultAlpha(params.effectType));
  const intensity = clamp01(params.intensity ?? defaultIntensity(params.effectType));

  return {
    ...params,
    effectType: params.effectType,
    alpha,
    intensity,
  };
}

function resolveEffectType(actionType: string, payloadType: ActionPayloadValue | undefined): EffectActionType | null {
  const normalizedActionType = actionType.trim().toLowerCase();
  const normalizedPayloadType = typeof payloadType === "string" ? payloadType.trim().toLowerCase() : "";
  const candidate = normalizedActionType === "effect" || normalizedActionType === "fade" ? normalizedPayloadType : normalizedActionType;

  if (candidate === "fade_in" || candidate === "fadein") {
    return "fade_in";
  }

  if (candidate === "fade_out" || candidate === "fadeout") {
    return "fade_out";
  }

  if (candidate === "flash") {
    return "flash";
  }

  return null;
}

function isEffectActionType(value: ActionPayloadValue | undefined): value is EffectActionType {
  return value === "fade_in" || value === "fade_out" || value === "flash";
}

function readNumber(value: ActionPayloadValue | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isFiniteNumber(value: ActionPayloadValue | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function defaultAlpha(_effectType: EffectActionType): number {
  return 1;
}

function defaultIntensity(effectType: EffectActionType): number {
  return effectType === "flash" ? 1 : 0;
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}
