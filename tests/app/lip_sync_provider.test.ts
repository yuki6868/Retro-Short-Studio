import { describe, expect, it } from "vitest";

import { GenerateLipSyncForTalkActionUseCase, type LipSyncProvider, type LipSyncRequest } from "../../app/src";
import { Action, Asset, Project, Scene } from "../../core/src";

class FakeLipSyncProvider implements LipSyncProvider {
  readonly requests: LipSyncRequest[] = [];

  async generate(request: LipSyncRequest) {
    this.requests.push(request);
    return {
      mouthCues: [
        { startTime: 0, endTime: 0.08, mouth: "closed" },
        { startTime: 0.08, endTime: 0.22, mouth: "open" },
      ],
    };
  }
}

function createProject(): Project {
  const project = Project.create({ projectId: "project-1", projectName: "Lip Sync Short" });
  project.addAsset(
    Asset.create({
      assetId: "voice-1",
      assetName: "Voice action-talk-1",
      assetType: "voice",
      assetPath: "projects/project-1/voices/action-talk-1.wav",
    }),
  );
  project.addScene(
    Scene.create({
      sceneId: "scene-1",
      sceneName: "Opening",
      duration: 5,
      actions: [
        Action.create({
          actionId: "action-talk-1",
          actionType: "talk",
          startTime: 0,
          endTime: 2,
          targetId: "character-1",
          payload: {
            text: "テストなのだ",
            speakerId: "8",
            speakerCharacterId: "character-1",
            lipSyncEnabled: true,
            voiceAssetId: "voice-1",
            generatedVoicePath: null,
            generatedVoiceDuration: 1.98,
            mouthCues: [],
          },
        }).toSnapshot(),
      ],
    }),
  );
  return project;
}

describe("LipSyncProvider boundary", () => {
  it("generates mouth cues through a replaceable provider and stores them on the TalkAction payload", async () => {
    const project = createProject();
    const provider = new FakeLipSyncProvider();
    const useCase = new GenerateLipSyncForTalkActionUseCase({ project, lipSyncProvider: provider });

    const result = await useCase.generateForTalkAction({ sceneId: "scene-1", actionId: "action-talk-1" });

    expect(provider.requests).toEqual([
      {
        projectId: "project-1",
        sceneId: "scene-1",
        talkActionId: "action-talk-1",
        audioPath: "projects/project-1/voices/action-talk-1.wav",
        duration: 1.98,
      },
    ]);
    expect(result.mouthCues).toEqual([
      { startTime: 0, endTime: 0.08, mouth: "closed" },
      { startTime: 0.08, endTime: 0.22, mouth: "open" },
    ]);
    expect(project.toSnapshot().scenes[0].actions[0].payload).toMatchObject({
      mouthCues: [
        { startTime: 0, endTime: 0.08, mouth: "closed" },
        { startTime: 0.08, endTime: 0.22, mouth: "open" },
      ],
    });
  });
});
