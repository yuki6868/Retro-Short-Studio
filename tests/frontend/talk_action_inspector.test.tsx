import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import type { ActionInspectorViewState } from "../../frontend/src";
import { createTalkActionPayload, TalkActionInspector } from "../../frontend/src";

describe("TalkActionInspector", () => {
  it("renders practical TalkAction fields instead of forcing JSON editing", () => {
    const html = renderToStaticMarkup(<TalkActionInspector action={createAction()} />);

    expect(html).toContain('aria-label="Talk Action Inspector"');
    expect(html).toContain('aria-label="Talk text"');
    expect(html).toContain("こんにちはなのだ");
    expect(html).toContain('aria-label="Talk speaker ID"');
    expect(html).toContain('value="3"');
    expect(html).toContain('aria-label="Talk speaker character ID"');
    expect(html).toContain('value="character-1"');
    expect(html).toContain('aria-label="Talk start time"');
    expect(html).toContain('aria-label="Talk end time"');
    expect(html).toContain('aria-label="Talk lip sync enabled"');
    expect(html).toContain("Generate Voice");
    expect(html).toContain("Play Voice");
    expect(html).not.toContain("Payload JSON");
  });

  it("preserves existing voice asset fields when one TalkAction field changes", () => {
    const payload = createTalkActionPayload(
      {
        text: "old",
        speakerId: "3",
        speakerCharacterId: "character-1",
        voiceAssetId: "asset-voice-1",
        generatedVoicePath: "voices/line001.wav",
        generatedVoiceDuration: 1.25,
        lipSyncEnabled: true,
      },
      "character-1",
    );

    expect({ ...payload, text: "new" }).toEqual({
      text: "new",
      speakerId: "3",
      speakerCharacterId: "character-1",
      voiceAssetId: "asset-voice-1",
      generatedVoicePath: "voices/line001.wav",
      generatedVoiceDuration: 1.25,
      lipSyncEnabled: true,
    });
  });

  it("falls back to safe defaults for incomplete TalkAction payloads", () => {
    expect(createTalkActionPayload({ text: "hello" }, "character-main")).toEqual({
      text: "hello",
      speakerId: "3",
      speakerCharacterId: "character-main",
      lipSyncEnabled: true,
      voiceAssetId: null,
      generatedVoicePath: null,
      generatedVoiceDuration: null,
    });
  });
});

function createAction(): ActionInspectorViewState {
  return {
    type: "action",
    title: "Action Inspector",
    selectedTargetLabel: "Action: talk",
    sceneId: "scene-1",
    actionId: "action-1",
    actionType: "talk",
    startTime: 1,
    endTime: 3,
    targetId: "character-1",
    payload: {
      text: "こんにちはなのだ",
      speakerId: "3",
      speakerCharacterId: "character-1",
      voiceAssetId: null,
      generatedVoicePath: null,
      generatedVoiceDuration: null,
      lipSyncEnabled: true,
    },
    payloadPreview: "{}",
    voice: {
      voiceAssetId: null,
      voiceAssetPath: null,
      generatedVoicePath: null,
      duration: null,
      canPlay: false,
    },
    fields: ["startTime", "endTime", "targetId", "payload"],
  };
}
