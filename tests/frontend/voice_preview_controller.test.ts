import { describe, expect, it } from "vitest";

import type {
  AssetLibraryState,
  GenerateVoiceResult,
  GenerateVoiceUseCase,
  InspectorState,
  TimelineState,
} from "../../app/src";
import { VoicePreviewController } from "../../frontend/src/react";
import type { VoicePreviewPlayer } from "../../frontend/src";

class FakeGenerateVoiceUseCase implements Pick<GenerateVoiceUseCase, "generateForTalkAction"> {
  readonly calls: { sceneId: string; actionId: string }[] = [];

  async generateForTalkAction(input: { sceneId: string; actionId: string }): Promise<GenerateVoiceResult> {
    this.calls.push(input);
    return {
      sceneId: input.sceneId,
      actionId: input.actionId,
      voiceAssetId: "voice-asset-1",
      voiceAssetPath: "projects/voices/action-talk-1.wav",
      duration: 1.25,
    };
  }
}

class FakeVoicePreviewPlayer implements VoicePreviewPlayer {
  readonly playedPaths: string[] = [];
  stopCount = 0;

  async play(path: string): Promise<void> {
    this.playedPaths.push(path);
  }

  stop(): void {
    this.stopCount += 1;
  }
}

describe("VoicePreviewController", () => {
  it("generates voice and refreshes asset, inspector, timeline, persistence, and status", async () => {
    const generateVoiceUseCase = new FakeGenerateVoiceUseCase();
    const player = new FakeVoicePreviewPlayer();
    let persistCount = 0;
    const controller = new VoicePreviewController({
      generateVoiceUseCase: generateVoiceUseCase as unknown as GenerateVoiceUseCase,
      player,
      persistProject: () => {
        persistCount += 1;
      },
    });
    const assetState = createAssetState();
    const inspectorState = createInspectorState();
    const timelineState = createTimelineState();
    const statuses: (string | null)[] = [];
    const refreshedStates: unknown[] = [];

    const result = await controller.generateSelectedActionVoice({
      sceneId: "scene-1",
      actionId: "action-talk-1",
      assetLibrary: { state: assetState } as never,
      inspector: { selectAction: () => inspectorState } as never,
      timeline: { showScene: () => timelineState } as never,
      setAssetState: (state) => refreshedStates.push(["asset", state]),
      setInspectorState: (state) => refreshedStates.push(["inspector", state]),
      setTimelineState: (state) => refreshedStates.push(["timeline", state]),
      setStatus: (status) => statuses.push(status),
    });

    expect(result).toBe(inspectorState);
    expect(generateVoiceUseCase.calls).toEqual([{ sceneId: "scene-1", actionId: "action-talk-1" }]);
    expect(refreshedStates).toEqual([
      ["asset", assetState],
      ["inspector", inspectorState],
      ["timeline", timelineState],
    ]);
    expect(persistCount).toBe(1);
    expect(statuses).toEqual(["Generating voice...", "Generated voice: projects/voices/action-talk-1.wav"]);
  });

  it("plays and stops the generated voice path through the preview player", async () => {
    const generateVoiceUseCase = new FakeGenerateVoiceUseCase();
    const player = new FakeVoicePreviewPlayer();
    const controller = new VoicePreviewController({
      generateVoiceUseCase: generateVoiceUseCase as unknown as GenerateVoiceUseCase,
      player,
    });
    const statuses: (string | null)[] = [];

    await controller.playSelectedActionVoice("projects/voices/action-talk-1.wav", (status) => statuses.push(status));
    controller.stopSelectedActionVoice((status) => statuses.push(status));

    expect(player.playedPaths).toEqual(["projects/voices/action-talk-1.wav"]);
    expect(player.stopCount).toBe(1);
    expect(statuses).toEqual(["Playing voice.", "Stopped voice."]);
  });
});

function createAssetState(): AssetLibraryState {
  return {
    selectedAssetId: "voice-asset-1",
    assets: [
      {
        assetId: "voice-asset-1",
        assetName: "Voice action-talk-1",
        assetType: "voice",
        assetPath: "projects/voices/action-talk-1.wav",
      },
    ],
  };
}

function createInspectorState(): InspectorState {
  return {
    selection: { type: "action", sceneId: "scene-1", actionId: "action-talk-1" },
    panel: {
      type: "action",
      title: "Action Inspector",
      selectedTargetLabel: "Action: talk",
      editableFields: ["startTime", "endTime", "targetId", "payload"],
      action: {
        sceneId: "scene-1",
        actionId: "action-talk-1",
        actionType: "talk",
        startTime: 0,
        endTime: 2,
        targetId: "character-1",
        payload: {
          text: "テストなのだ",
          speakerId: "3",
          speakerCharacterId: "character-1",
          lipSyncEnabled: true,
          voiceAssetId: "voice-asset-1",
          generatedVoicePath: "projects/voices/action-talk-1.wav",
          generatedVoiceDuration: 1.25,
        },
      },
      voice: {
        voiceAssetId: "voice-asset-1",
        voiceAssetPath: "projects/voices/action-talk-1.wav",
        generatedVoicePath: "projects/voices/action-talk-1.wav",
        duration: 1.25,
        canPlay: true,
      },
    },
  };
}

function createTimelineState(): TimelineState {
  return {
    sceneId: "scene-1",
    sceneName: "Opening",
    duration: 5,
    timeScale: 80,
    playhead: 0,
    tracks: [],
  };
}
