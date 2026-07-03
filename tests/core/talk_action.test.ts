import { describe, expect, it } from "vitest";

import { Action, Scene, TalkAction, isTalkActionSnapshot } from "../../core/src";

describe("TalkAction", () => {
  it("creates a typed talk action for a scene time range", () => {
    const talkAction = TalkAction.create({
      actionId: " talk-1 ",
      startTime: 1,
      endTime: 4,
      text: " こんにちは ",
      speakerCharacterId: " character-instance-1 ",
      voiceAssetId: " voice-1 ",
      lipSyncEnabled: true,
      mouthCues: [],
    });

    expect(talkAction.toSnapshot()).toEqual({
      actionId: "talk-1",
      actionType: "talk",
      startTime: 1,
      endTime: 4,
      targetId: "character-instance-1",
      payload: {
        text: "こんにちは",
        speakerId: "3",
        speakerCharacterId: "character-instance-1",
        voiceAssetId: "voice-1",
        generatedVoicePath: null,
        generatedVoiceDuration: null,
        lipSyncEnabled: true,
        mouthCues: [],
      },
    });
  });

  it("allows voiceAssetId to be null before voice generation", () => {
    const talkAction = TalkAction.create({
      actionId: "talk-1",
      startTime: 0,
      endTime: 2,
      text: "まだ音声生成前",
      speakerCharacterId: "character-instance-1",
    });

    expect(talkAction.toSnapshot().payload).toEqual({
      text: "まだ音声生成前",
      speakerId: "3",
      speakerCharacterId: "character-instance-1",
      voiceAssetId: null,
      generatedVoicePath: null,
      generatedVoiceDuration: null,
      lipSyncEnabled: true,
      mouthCues: [],
    });
  });

  it("can be added to a scene through the generic Action boundary", () => {
    const scene = Scene.create({ sceneId: "scene-1", sceneName: "Opening", duration: 10 });
    const talkAction = TalkAction.create({
      actionId: "talk-1",
      startTime: 0,
      endTime: 3,
      text: "シーン内のセリフ",
      speakerCharacterId: "character-instance-1",
      voiceAssetId: "voice-1",
      lipSyncEnabled: false,
    });

    scene.addAction(talkAction.toAction());

    expect(scene.toSnapshot().actions).toEqual([talkAction.toSnapshot()]);
  });

  it("restores from typed talk action snapshots without retaining references", () => {
    const snapshot = TalkAction.create({
      actionId: "talk-1",
      startTime: 0,
      endTime: 3,
      text: "before",
      speakerCharacterId: "character-instance-1",
      voiceAssetId: "voice-1",
      lipSyncEnabled: true,
    }).toSnapshot();

    const restored = TalkAction.restore(snapshot);
    snapshot.payload.text = "after";

    expect(restored.toSnapshot().payload.text).toBe("before");
  });

  it("can wrap an existing generic talk action only when payload is valid", () => {
    const action = Action.create({
      actionId: "talk-1",
      actionType: "talk",
      startTime: 0,
      endTime: 2,
      targetId: "character-instance-1",
      payload: {
        text: "こんにちは",
        speakerId: "8",
        speakerCharacterId: "character-instance-1",
        voiceAssetId: null,
        generatedVoicePath: null,
        generatedVoiceDuration: null,
        lipSyncEnabled: true,
        mouthCues: [],
      },
    });

    expect(TalkAction.fromAction(action).toSnapshot().payload).toMatchObject({
      text: "こんにちは",
      speakerId: "8",
      generatedVoicePath: null,
      generatedVoiceDuration: null,
    });
    expect(isTalkActionSnapshot(action.toSnapshot())).toBe(true);
  });

  it("rejects invalid talk payloads instead of relying on renderer-side checks", () => {
    expect(() =>
      TalkAction.create({
        actionId: "talk-1",
        startTime: 0,
        endTime: 2,
        text: "   ",
        speakerCharacterId: "character-instance-1",
      }),
    ).toThrow("TalkAction text is required.");

    expect(() =>
      TalkAction.create({
        actionId: "talk-1",
        startTime: 0,
        endTime: 2,
        text: "こんにちは",
        speakerCharacterId: "   ",
      }),
    ).toThrow("CharacterInstanceId is required.");

    expect(() =>
      TalkAction.create({
        actionId: "talk-1",
        startTime: 0,
        endTime: 2,
        text: "こんにちは",
        speakerCharacterId: "character-instance-1",
        voiceAssetId: "   ",
      }),
    ).toThrow("AssetId is required.");
  });

  it("does not treat mismatched targetId and speakerCharacterId as a valid TalkAction", () => {
    const action = Action.create({
      actionId: "talk-1",
      actionType: "talk",
      startTime: 0,
      endTime: 2,
      targetId: "other-character-instance",
      payload: {
        text: "こんにちは",
        speakerId: "3",
        speakerCharacterId: "character-instance-1",
        voiceAssetId: null,
        generatedVoicePath: null,
        generatedVoiceDuration: null,
        lipSyncEnabled: true,
        mouthCues: [],
      },
    });

    expect(isTalkActionSnapshot(action.toSnapshot())).toBe(false);
    expect(() => TalkAction.fromAction(action)).toThrow("Action snapshot is not a TalkAction.");
  });
});
