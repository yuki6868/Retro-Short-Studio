import {
  ActionId,
  ActionPayload,
  type ActionPayloadRecord,
  ActionTargetId,
  ActionTimeRange,
  ActionType,
} from "./valueObjects";

export type ActionSnapshot = {
  actionId: string;
  actionType: string;
  startTime: number;
  endTime: number;
  targetId: string | null;
  payload: ActionPayloadRecord;
};

export class Action {
  private constructor(
    private readonly id: ActionId,
    private type: ActionType,
    private timeRange: ActionTimeRange,
    private targetId: ActionTargetId,
    private payload: ActionPayload,
  ) {}

  static create(params: {
    actionId: string;
    actionType: string;
    startTime: number;
    endTime: number;
    targetId?: string | null;
    payload?: ActionPayloadRecord;
  }): Action {
    return new Action(
      ActionId.create(params.actionId),
      ActionType.create(params.actionType),
      ActionTimeRange.create(params.startTime, params.endTime),
      ActionTargetId.create(params.targetId ?? null),
      ActionPayload.create(params.payload ?? {}),
    );
  }

  static restore(snapshot: ActionSnapshot): Action {
    return Action.create(snapshot);
  }

  changeTimeRange(startTime: number, endTime: number): void {
    this.timeRange = ActionTimeRange.create(startTime, endTime);
  }

  changeTarget(targetId: string | null): void {
    this.targetId = ActionTargetId.create(targetId);
  }

  replacePayload(payload: ActionPayloadRecord): void {
    this.payload = ActionPayload.create(payload);
  }

  changeType(actionType: string): void {
    this.type = ActionType.create(actionType);
  }

  toSnapshot(): ActionSnapshot {
    return {
      actionId: this.id.toString(),
      actionType: this.type.toString(),
      ...this.timeRange.toValues(),
      targetId: this.targetId.toStringOrNull(),
      payload: this.payload.toRecord(),
    };
  }
}
