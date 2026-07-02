import type { ReactElement } from "react";

import type { ChangeActionTimeRangeInput, InspectorState } from "../../../app/src";
import type { ActionInspectorViewState } from "./Inspector";

export type TalkActionPayload = {
  text: string;
  speakerId: string;
  speakerCharacterId: string;
  lipSyncEnabled: boolean;
  voiceAssetId: string | null;
  generatedVoicePath: string | null;
  generatedVoiceDuration: number | null;
};

export type TalkActionInspectorProps = {
  action: ActionInspectorViewState;
  voiceStatus?: string | null;
  onEditActionTimeRange?: (input: ChangeActionTimeRangeInput) => unknown;
  onEditActionTarget?: (sceneId: string, actionId: string, targetId: string | null) => InspectorState;
  onEditActionPayload?: (
    sceneId: string,
    actionId: string,
    payload: Record<string, string | number | boolean | null>,
  ) => unknown;
  onGenerateActionVoice?: (sceneId: string, actionId: string) => Promise<InspectorState>;
  onPlayActionVoice?: (voiceAssetPath: string) => Promise<void>;
  onStopActionVoice?: () => void;
  onDeleteAction?: (sceneId: string, actionId: string) => unknown;
};

export function TalkActionInspector({
  action,
  voiceStatus,
  onEditActionTimeRange,
  onEditActionTarget,
  onEditActionPayload,
  onGenerateActionVoice,
  onPlayActionVoice,
  onStopActionVoice,
  onDeleteAction,
}: TalkActionInspectorProps): ReactElement {
  const payload = createTalkActionPayload(action.payload, action.targetId);

  const updatePayload = (patch: Partial<TalkActionPayload>): void => {
    const nextPayload = { ...payload, ...patch };
    onEditActionPayload?.(action.sceneId, action.actionId, nextPayload);
  };

  return (
    <div className="rss-inspector" aria-label="Talk Action Inspector">
      <p>{action.selectedTargetLabel}</p>
      <p>{action.actionType}</p>
      <label>
        Text
        <textarea
          aria-label="Talk text"
          defaultValue={payload.text}
          onBlur={(event) => updatePayload({ text: event.currentTarget.value })}
        />
      </label>
      <label>
        Speaker ID
        <input
          aria-label="Talk speaker ID"
          defaultValue={payload.speakerId}
          onBlur={(event) => updatePayload({ speakerId: event.currentTarget.value.trim() })}
        />
      </label>
      <label>
        Speaker character ID
        <input
          aria-label="Talk speaker character ID"
          defaultValue={payload.speakerCharacterId}
          onBlur={(event) => {
            const speakerCharacterId = event.currentTarget.value.trim();
            updatePayload({ speakerCharacterId });
            onEditActionTarget?.(action.sceneId, action.actionId, speakerCharacterId.length === 0 ? null : speakerCharacterId);
          }}
        />
      </label>
      <label>
        Start time
        <input
          aria-label="Talk start time"
          defaultValue={action.startTime}
          min={0}
          onBlur={(event) =>
            onEditActionTimeRange?.({
              sceneId: action.sceneId,
              actionId: action.actionId,
              startTime: Number(event.currentTarget.value),
              endTime: action.endTime,
            })
          }
          step={0.1}
          type="number"
        />
      </label>
      <label>
        End time
        <input
          aria-label="Talk end time"
          defaultValue={action.endTime}
          min={0}
          onBlur={(event) =>
            onEditActionTimeRange?.({
              sceneId: action.sceneId,
              actionId: action.actionId,
              startTime: action.startTime,
              endTime: Number(event.currentTarget.value),
            })
          }
          step={0.1}
          type="number"
        />
      </label>
      <label>
        <input
          aria-label="Talk lip sync enabled"
          checked={payload.lipSyncEnabled}
          onChange={(event) => updatePayload({ lipSyncEnabled: event.currentTarget.checked })}
          type="checkbox"
        />
        Lip sync enabled
      </label>
      <div className="rss-inspector__voice" aria-label="Talk voice preview">
        <button
          disabled={onGenerateActionVoice === undefined}
          onClick={() => void onGenerateActionVoice?.(action.sceneId, action.actionId)}
          type="button"
        >
          Generate Voice
        </button>
        <button
          disabled={action.voice?.canPlay !== true || onPlayActionVoice === undefined}
          onClick={() => {
            const path = action.voice?.voiceAssetPath;
            if (path !== undefined && path !== null) {
              void onPlayActionVoice?.(path);
            }
          }}
          type="button"
        >
          Play Voice
        </button>
        <button
          disabled={action.voice?.canPlay !== true || onStopActionVoice === undefined}
          onClick={() => onStopActionVoice?.()}
          type="button"
        >
          Stop Voice
        </button>
        <p>voiceAssetPath: {action.voice?.voiceAssetPath ?? "Not generated"}</p>
        <p>duration: {formatVoiceDuration(action.voice?.duration ?? null)}</p>
      </div>
      {voiceStatus !== null && voiceStatus !== undefined ? <p role="status">{voiceStatus}</p> : null}
      <button onClick={() => onDeleteAction?.(action.sceneId, action.actionId)} type="button">
        Delete Action
      </button>
    </div>
  );
}

export function createTalkActionPayload(payload: Record<string, unknown>, fallbackTargetId: string | null): TalkActionPayload {
  return {
    text: normalizeString(payload.text, ""),
    speakerId: normalizeString(payload.speakerId, "3"),
    speakerCharacterId: normalizeString(payload.speakerCharacterId, fallbackTargetId ?? ""),
    lipSyncEnabled: normalizeBoolean(payload.lipSyncEnabled, true),
    voiceAssetId: normalizeNullableString(payload.voiceAssetId),
    generatedVoicePath: normalizeNullableString(payload.generatedVoicePath),
    generatedVoiceDuration: normalizeNullableNumber(payload.generatedVoiceDuration),
  };
}

function normalizeString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function normalizeNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatVoiceDuration(duration: number | null): string {
  return duration === null ? "Unknown" : `${duration.toFixed(2)}s`;
}
