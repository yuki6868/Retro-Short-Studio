import { AssetId } from "../asset";
import { CharacterInstanceId } from "../character";
import { assertNonEmptyString } from "../validation";
import { Action, type ActionSnapshot } from "./Action";
import type { ActionPayloadRecord, ActionPayloadValue } from "./valueObjects";

export type TalkActionPayload = ActionPayloadRecord & {
  text: string;
  speakerId: string;
  speakerCharacterId: string;
  voiceAssetId: string | null;
  generatedVoicePath: string | null;
  generatedVoiceDuration: number | null;
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
    speakerId?: string;
    speakerCharacterId: string;
    voiceAssetId?: string | null;
    generatedVoicePath?: string | null;
    generatedVoiceDuration?: number | null;
    lipSyncEnabled?: boolean;
  }): TalkAction {
    const payload = createTalkActionPayload({
      text: params.text,
      speakerId: params.speakerId ?? "3",
      speakerCharacterId: params.speakerCharacterId,
      voiceAssetId: params.voiceAssetId ?? null,
      generatedVoicePath: params.generatedVoicePath ?? null,
      generatedVoiceDuration: params.generatedVoiceDuration ?? null,
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
      speakerId: snapshot.payload.speakerId,
      speakerCharacterId: snapshot.payload.speakerCharacterId,
      voiceAssetId: snapshot.payload.voiceAssetId,
      generatedVoicePath: snapshot.payload.generatedVoicePath,
      generatedVoiceDuration: snapshot.payload.generatedVoiceDuration,
      lipSyncEnabled: snapshot.payload.lipSyncEnabled,
    });
  }

  static fromAction(action: Action): TalkAction {
    const snapshot = action.toSnapshot();

    if (isTalkActionSnapshot(snapshot)) {
      return TalkAction.restore(snapshot);
    }

    if (snapshot.actionType !== "talk") {
      throw new Error("Action snapshot is not a TalkAction.");
    }

    const speakerCharacterId = readOptionalString(snapshot.payload.speakerCharacterId) ?? snapshot.targetId;

    if (speakerCharacterId === null) {
      throw new Error("TalkAction speakerCharacterId is required.");
    }

    const payload = hydrateTalkActionPayload(snapshot.payload, speakerCharacterId);

    if (snapshot.targetId !== null && snapshot.targetId !== payload.speakerCharacterId) {
      throw new Error("Action snapshot is not a TalkAction.");
    }

    return TalkAction.restore({
      ...snapshot,
      actionType: "talk",
      targetId: payload.speakerCharacterId,
      payload,
    });
  }

  updateVoice(params: {
    speakerId: string;
    voiceAssetId: string;
    generatedVoicePath: string;
    generatedVoiceDuration: number;
  }): void {
    const snapshot = this.toSnapshot();
    const payload = createTalkActionPayload({
      ...snapshot.payload,
      speakerId: params.speakerId,
      voiceAssetId: params.voiceAssetId,
      generatedVoicePath: params.generatedVoicePath,
      generatedVoiceDuration: params.generatedVoiceDuration,
    });

    this.action.replacePayload(payload);
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

function hydrateTalkActionPayload(payload: ActionPayloadRecord, fallbackSpeakerCharacterId?: string): TalkActionPayload {
  return createTalkActionPayload({
    text: readRequiredString(payload.text, "TalkAction text"),
    speakerId: readOptionalString(payload.speakerId) ?? "3",
    speakerCharacterId:
      readOptionalString(payload.speakerCharacterId) ??
      readOptionalString(fallbackSpeakerCharacterId) ??
      readRequiredString(payload.speakerCharacterId, "TalkAction speakerCharacterId"),
    voiceAssetId: readOptionalString(payload.voiceAssetId),
    generatedVoicePath: readOptionalString(payload.generatedVoicePath),
    generatedVoiceDuration: readOptionalNumber(payload.generatedVoiceDuration),
    lipSyncEnabled: typeof payload.lipSyncEnabled === "boolean" ? payload.lipSyncEnabled : true,
  });
}

function readRequiredString(value: ActionPayloadValue | undefined, name: string): string {
  if (typeof value !== "string") {
    throw new Error(`${name} is required.`);
  }

  return assertNonEmptyString(value, name);
}

function readOptionalString(value: ActionPayloadValue | undefined): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readOptionalNumber(value: ActionPayloadValue | undefined): number | null {
  return typeof value === "number" ? value : null;
}

function createTalkActionPayload(params: TalkActionPayload): TalkActionPayload {
  const text = assertNonEmptyString(params.text, "TalkAction text");
  const speakerId = assertNonEmptyString(params.speakerId, "TalkAction speakerId");
  const speakerCharacterId = CharacterInstanceId.create(params.speakerCharacterId).toString();
  const voiceAssetId = normalizeVoiceAssetId(params.voiceAssetId);
  const generatedVoicePath = normalizeGeneratedVoicePath(params.generatedVoicePath);
  const generatedVoiceDuration = normalizeGeneratedVoiceDuration(params.generatedVoiceDuration);

  if (typeof params.lipSyncEnabled !== "boolean") {
    throw new Error("TalkAction lipSyncEnabled must be a boolean.");
  }

  if (voiceAssetId === null && (generatedVoicePath !== null || generatedVoiceDuration !== null)) {
    throw new Error("TalkAction generated voice fields require voiceAssetId.");
  }

  return {
    text,
    speakerId,
    speakerCharacterId,
    voiceAssetId,
    generatedVoicePath,
    generatedVoiceDuration,
    lipSyncEnabled: params.lipSyncEnabled,
  };
}

function normalizeVoiceAssetId(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  return AssetId.create(value).toString();
}

function normalizeGeneratedVoicePath(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  return assertNonEmptyString(value, "TalkAction generatedVoicePath");
}

function normalizeGeneratedVoiceDuration(value: number | null): number | null {
  if (value === null) {
    return null;
  }

  if (!Number.isFinite(value) || value < 0) {
    throw new Error("TalkAction generatedVoiceDuration must be a non-negative number.");
  }

  return value;
}

function isTalkActionPayload(payload: ActionPayloadRecord): payload is TalkActionPayload {
  return (
    isStringPayloadValue(payload.text) &&
    isStringPayloadValue(payload.speakerId) &&
    isStringPayloadValue(payload.speakerCharacterId) &&
    isStringOrNullPayloadValue(payload.voiceAssetId) &&
    isStringOrNullPayloadValue(payload.generatedVoicePath) &&
    isNumberOrNullPayloadValue(payload.generatedVoiceDuration) &&
    typeof payload.lipSyncEnabled === "boolean"
  );
}

function isStringPayloadValue(value: ActionPayloadValue | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringOrNullPayloadValue(value: ActionPayloadValue | undefined): value is string | null {
  return value === null || isStringPayloadValue(value);
}

function isNumberOrNullPayloadValue(value: ActionPayloadValue | undefined): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0);
}
