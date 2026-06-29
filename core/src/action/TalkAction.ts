import { AssetId } from "../asset";
import { CharacterInstanceId } from "../character";
import { assertNonEmptyString } from "../validation";
import { Action, type ActionSnapshot } from "./Action";
import type { ActionPayloadRecord, ActionPayloadValue } from "./valueObjects";

export type TalkActionPayload = ActionPayloadRecord & {
  text: string;
  speakerCharacterId: string;
  voiceAssetId: string | null;
  lipSyncEnabled: boolean;
};

export type TalkActionSnapshot = Omit<ActionSnapshot, "actionType" | "targetId" | "payload"> & {
  actionType: "talk";
  targetId: string;
  payload: TalkActionPayload;
};

export class TalkAction {
  private constructor(private readonly action: Action) {}

  static create(params: {
    actionId: string;
    startTime: number;
    endTime: number;
    text: string;
    speakerCharacterId: string;
    voiceAssetId?: string | null;
    lipSyncEnabled?: boolean;
  }): TalkAction {
    const payload = createTalkActionPayload({
      text: params.text,
      speakerCharacterId: params.speakerCharacterId,
      voiceAssetId: params.voiceAssetId ?? null,
      lipSyncEnabled: params.lipSyncEnabled ?? true,
    });

    return new TalkAction(
      Action.create({
        actionId: params.actionId,
        actionType: "talk",
        startTime: params.startTime,
        endTime: params.endTime,
        targetId: payload.speakerCharacterId,
        payload,
      }),
    );
  }

  static restore(snapshot: TalkActionSnapshot): TalkAction {
    return TalkAction.create({
      actionId: snapshot.actionId,
      startTime: snapshot.startTime,
      endTime: snapshot.endTime,
      text: snapshot.payload.text,
      speakerCharacterId: snapshot.payload.speakerCharacterId,
      voiceAssetId: snapshot.payload.voiceAssetId,
      lipSyncEnabled: snapshot.payload.lipSyncEnabled,
    });
  }

  static fromAction(action: Action): TalkAction {
    const snapshot = action.toSnapshot();

    if (!isTalkActionSnapshot(snapshot)) {
      throw new Error("Action snapshot is not a TalkAction.");
    }

    return TalkAction.restore(snapshot);
  }

  toAction(): Action {
    return Action.restore(this.action.toSnapshot());
  }

  toSnapshot(): TalkActionSnapshot {
    const snapshot = this.action.toSnapshot();

    if (!isTalkActionSnapshot(snapshot)) {
      throw new Error("Action snapshot is not a TalkAction.");
    }

    return snapshot;
  }
}

export function isTalkActionSnapshot(snapshot: ActionSnapshot): snapshot is TalkActionSnapshot {
  if (snapshot.actionType !== "talk") {
    return false;
  }

  if (snapshot.targetId === null) {
    return false;
  }

  if (!isTalkActionPayload(snapshot.payload)) {
    return false;
  }

  return snapshot.targetId === snapshot.payload.speakerCharacterId;
}

function createTalkActionPayload(params: TalkActionPayload): TalkActionPayload {
  const text = assertNonEmptyString(params.text, "TalkAction text");
  const speakerCharacterId = CharacterInstanceId.create(params.speakerCharacterId).toString();
  const voiceAssetId = normalizeVoiceAssetId(params.voiceAssetId);

  if (typeof params.lipSyncEnabled !== "boolean") {
    throw new Error("TalkAction lipSyncEnabled must be a boolean.");
  }

  return {
    text,
    speakerCharacterId,
    voiceAssetId,
    lipSyncEnabled: params.lipSyncEnabled,
  };
}

function normalizeVoiceAssetId(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  return AssetId.create(value).toString();
}

function isTalkActionPayload(payload: ActionPayloadRecord): payload is TalkActionPayload {
  return (
    isStringPayloadValue(payload.text) &&
    isStringPayloadValue(payload.speakerCharacterId) &&
    isStringOrNullPayloadValue(payload.voiceAssetId) &&
    typeof payload.lipSyncEnabled === "boolean"
  );
}

function isStringPayloadValue(value: ActionPayloadValue | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringOrNullPayloadValue(value: ActionPayloadValue | undefined): value is string | null {
  return value === null || isStringPayloadValue(value);
}
