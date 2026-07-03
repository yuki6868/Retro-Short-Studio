import { describe, expect, it } from "vitest";

import { GenerateLipSyncForTalkActionUseCase, VolumeLipSyncProvider } from "../../app/src";
import { Action, Asset, Project, Scene } from "../../core/src";

function createPcm16Wav(samples: number[], sampleRate = 30): Uint8Array {
  const dataSize = samples.length * 2;
  const bytes = new Uint8Array(44 + dataSize);
  const view = new DataView(bytes.buffer);
  writeAscii(bytes, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(bytes, 8, "WAVE");
  writeAscii(bytes, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(bytes, 36, "data");
  view.setUint32(40, dataSize, true);

  samples.forEach((sample, index) => {
    view.setInt16(44 + index * 2, Math.round(sample * 32767), true);
  });

  return bytes;
}

function writeAscii(bytes: Uint8Array, offset: number, value: string): void {
  [...value].forEach((char, index) => {
    bytes[offset + index] = char.charCodeAt(0);
  });
}

describe("VolumeLipSyncProvider", () => {
  it("generates closed, half, and open mouth cues from 16-bit PCM WAV volume", async () => {
    const wav = createPcm16Wav([0, 0.1, 0.5], 3);
    const provider = new VolumeLipSyncProvider({
      frameRate: 3,
      closedThreshold: 0.03,
      openThreshold: 0.3,
      readFile: async (path) => {
        expect(path).toBe("projects/project-1/voices/action-talk-1.wav");
        return wav;
      },
    });

    const result = await provider.generate({
      projectId: "project-1",
      sceneId: "scene-1",
      talkActionId: "action-talk-1",
      audioPath: "projects/project-1/voices/action-talk-1.wav",
      duration: 1,
    });

    expect(result.mouthCues).toEqual([
      { startTime: 0, endTime: 0.333333, mouth: "closed" },
      { startTime: 0.333333, endTime: 0.666667, mouth: "half" },
      { startTime: 0.666667, endTime: 1, mouth: "open" },
    ]);
  });

  it("reads generatedVoicePath through the lip sync use case after voice generation", async () => {
    const wav = createPcm16Wav([0.5, 0.5], 2);
    const project = Project.create({ projectId: "project-1", projectName: "Lip Sync" });
    project.addAsset(Asset.create({ assetId: "voice-1", assetName: "Voice talk-1", assetType: "voice", assetPath: "projects/project-1/voices/talk-1.wav" }));
    project.addScene(
      Scene.create({
        sceneId: "scene-1",
        sceneName: "Opening",
        duration: 2,
        actions: [
          Action.create({
            actionId: "talk-1",
            actionType: "talk",
            startTime: 0,
            endTime: 1,
            targetId: "character-1",
            payload: {
              text: "テスト",
              speakerId: "8",
              speakerCharacterId: "character-1",
              lipSyncEnabled: true,
              voiceAssetId: "voice-1",
              generatedVoicePath: "projects/project-1/voices/talk-1.wav",
              generatedVoiceDuration: 1,
              mouthCues: [],
            },
          }).toSnapshot(),
        ],
      }),
    );
    const provider = new VolumeLipSyncProvider({
      frameRate: 2,
      openThreshold: 0.3,
      readFile: async () => wav,
    });
    const useCase = new GenerateLipSyncForTalkActionUseCase({ project, lipSyncProvider: provider });

    await useCase.generateForTalkAction({ sceneId: "scene-1", actionId: "talk-1" });

    expect(project.toSnapshot().scenes[0]?.actions[0]?.payload.mouthCues).toEqual([
      { startTime: 0, endTime: 1, mouth: "open" },
    ]);
  });

  it("stores no cues and does not call the provider when a Talk Action has no voice", async () => {
    const project = Project.create({ projectId: "project-1", projectName: "Lip Sync" });
    project.addScene(
      Scene.create({
        sceneId: "scene-1",
        sceneName: "Opening",
        duration: 2,
        actions: [
          Action.create({
            actionId: "talk-1",
            actionType: "talk",
            startTime: 0,
            endTime: 1,
            targetId: "character-1",
            payload: {
              text: "テスト",
              speakerId: "8",
              speakerCharacterId: "character-1",
              lipSyncEnabled: true,
              voiceAssetId: null,
              generatedVoicePath: null,
              generatedVoiceDuration: null,
              mouthCues: [{ startTime: 0, endTime: 0.5, mouth: "open" }],
            },
          }).toSnapshot(),
        ],
      }),
    );
    let readCount = 0;
    const provider = new VolumeLipSyncProvider({
      readFile: async () => {
        readCount += 1;
        return createPcm16Wav([0.5], 1);
      },
    });
    const useCase = new GenerateLipSyncForTalkActionUseCase({ project, lipSyncProvider: provider });

    const result = await useCase.generateForTalkAction({ sceneId: "scene-1", actionId: "talk-1" });

    expect(result.mouthCues).toEqual([]);
    expect(readCount).toBe(0);
    expect(project.toSnapshot().scenes[0]?.actions[0]?.payload.mouthCues).toEqual([]);
  });
});
