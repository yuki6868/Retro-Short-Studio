import type { ActionPayloadRecord, ActionSnapshot, AssetSnapshot } from "../../../core/src";

export type TalkActionVoiceState = {
  voiceAssetId: string | null;
  voiceAssetPath: string | null;
  generatedVoicePath: string | null;
  duration: number | null;
  canPlay: boolean;
};

export function createTalkActionVoiceState(input: {
  action: ActionSnapshot;
  assets: AssetSnapshot[];
}): TalkActionVoiceState | null {
  if (input.action.actionType !== "talk") {
    return null;
  }

  const payload = input.action.payload;
  const voiceAssetId = readStringOrNull(payload.voiceAssetId);
  const generatedVoicePath = readStringOrNull(payload.generatedVoicePath);
  const duration = readNumberOrNull(payload.generatedVoiceDuration);
  const voiceAssetPath = resolveVoiceAssetPath({
    assets: input.assets,
    voiceAssetId,
    generatedVoicePath,
  });

  return {
    voiceAssetId,
    voiceAssetPath,
    generatedVoicePath,
    duration,
    canPlay: voiceAssetPath !== null,
  };
}

function resolveVoiceAssetPath(input: {
  assets: AssetSnapshot[];
  voiceAssetId: string | null;
  generatedVoicePath: string | null;
}): string | null {
  if (input.generatedVoicePath !== null) {
    return input.generatedVoicePath;
  }

  if (input.voiceAssetId === null) {
    return null;
  }

  const asset = input.assets.find((candidate) => candidate.assetId === input.voiceAssetId);

  if (asset === undefined || asset.assetType !== "voice") {
    return null;
  }

  return asset.assetPath;
}

function readStringOrNull(value: ActionPayloadRecord[string]): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readNumberOrNull(value: ActionPayloadRecord[string]): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}
