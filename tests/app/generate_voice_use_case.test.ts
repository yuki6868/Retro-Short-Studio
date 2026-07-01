import { describe, expect, it } from "vitest";

import { GenerateVoiceUseCase } from "../../app/src";
import { Project, Scene, Action, type IdGenerator } from "../../core/src";
import type { EngineClient, EngineCommandRequest, EngineResult, ExportRequest, ExportResult, PreviewRequest, PreviewResult, RenderRequest, RenderResult, VoiceRequest, VoiceResult } from "../../shared";

class FixedIdGenerator implements IdGenerator {
  generate(prefix: string): string {
    return `${prefix}-asset-1`;
  }
}

class FakeVoiceEngineClient implements EngineClient {
  readonly requests: VoiceRequest[] = [];

  async execute(command: EngineCommandRequest): Promise<EngineResult> {
    return { commandId: command.commandId, ok: false, payload: null, error: "not used" };
  }

  async preview(_request: PreviewRequest): Promise<EngineResult<PreviewResult>> {
    throw new Error("preview is not used by GenerateVoiceUseCase.");
  }

  async render(_request: RenderRequest): Promise<EngineResult<RenderResult>> {
    throw new Error("render is not used by GenerateVoiceUseCase.");
  }

  async generateVoice(request: VoiceRequest): Promise<EngineResult<VoiceResult>> {
    this.requests.push(request);
    return {
      commandId: "voice-test",
      ok: true,
      payload: {
        voiceAssetId: null,
        wavPath: request.outputPath,
        duration: 1.25,
      },
      error: null,
    };
  }

  async exportVideo(_request: ExportRequest): Promise<EngineResult<ExportResult>> {
    throw new Error("exportVideo is not used by GenerateVoiceUseCase.");
  }
}

function createProject(): Project {
  const project = Project.create({ projectId: "project-1", projectName: "Voice Short" });
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
            voiceAssetId: null,
            generatedVoicePath: null,
            generatedVoiceDuration: null,
          },
        }).toSnapshot(),
      ],
    }),
  );
  return project;
}

describe("GenerateVoiceUseCase", () => {
  it("generates voice for a TalkAction, registers a VoiceAsset, and stores the asset id on the action", async () => {
    const project = createProject();
    const engineClient = new FakeVoiceEngineClient();
    const useCase = new GenerateVoiceUseCase({
      project,
      engineClient,
      idGenerator: new FixedIdGenerator(),
      defaultSpeakerId: "3",
      defaultOutputDirectory: "projects/voices",
    });

    const result = await useCase.generateForTalkAction({ sceneId: "scene-1", actionId: "action-talk-1" });

    expect(engineClient.requests).toEqual([
      {
        projectId: "project-1",
        talkActionId: "action-talk-1",
        text: "テストなのだ",
        speakerId: "8",
        outputPath: "projects/voices/action-talk-1.wav",
      },
    ]);
    expect(result).toEqual({
      sceneId: "scene-1",
      actionId: "action-talk-1",
      voiceAssetId: "voice-asset-1",
      voiceAssetPath: "projects/voices/action-talk-1.wav",
      duration: 1.25,
    });
    expect(project.toSnapshot().assets).toContainEqual({
      assetId: "voice-asset-1",
      assetName: "Voice action-talk-1",
      assetType: "voice",
      assetPath: "projects/voices/action-talk-1.wav",
    });
    expect(project.toSnapshot().scenes[0].actions[0].payload).toMatchObject({
      voiceAssetId: "voice-asset-1",
      speakerId: "8",
      generatedVoicePath: "projects/voices/action-talk-1.wav",
      generatedVoiceDuration: 1.25,
    });
  });


  it("rejects empty talk text before calling the engine", async () => {
    const project = createProject();
    project.updateScene("scene-1", (scene) => {
      scene.updateAction("action-talk-1", (action) => {
        action.replacePayload({
          ...action.toSnapshot().payload,
          text: "   ",
        });
      });
    });
    const engineClient = new FakeVoiceEngineClient();
    const useCase = new GenerateVoiceUseCase({ project, engineClient, idGenerator: new FixedIdGenerator() });

    await expect(useCase.generateForTalkAction({ sceneId: "scene-1", actionId: "action-talk-1" })).rejects.toThrow(
      "TalkAction text is required before generating voice.",
    );
    expect(engineClient.requests).toEqual([]);
  });

  it("uses an explicit input speakerId over the TalkAction payload speakerId", async () => {
    const project = createProject();
    const engineClient = new FakeVoiceEngineClient();
    const useCase = new GenerateVoiceUseCase({
      project,
      engineClient,
      idGenerator: new FixedIdGenerator(),
      defaultOutputDirectory: "projects/voices",
    });

    await useCase.generateForTalkAction({ sceneId: "scene-1", actionId: "action-talk-1", speakerId: "13" });

    expect(engineClient.requests[0].speakerId).toBe("13");
    expect(project.toSnapshot().scenes[0].actions[0].payload).toMatchObject({ speakerId: "13" });
  });

  it("rejects non-talk actions before calling the engine", async () => {
    const project = Project.create({ projectId: "project-1", projectName: "Voice Short" });
    project.addScene(
      Scene.create({
        sceneId: "scene-1",
        sceneName: "Opening",
        duration: 5,
        actions: [
          Action.create({
            actionId: "move-1",
            actionType: "move",
            startTime: 0,
            endTime: 1,
            targetId: null,
            payload: {},
          }).toSnapshot(),
        ],
      }),
    );
    const engineClient = new FakeVoiceEngineClient();
    const useCase = new GenerateVoiceUseCase({ project, engineClient, idGenerator: new FixedIdGenerator() });

    await expect(useCase.generateForTalkAction({ sceneId: "scene-1", actionId: "move-1" })).rejects.toThrow(
      "Voice can only be generated for talk actions: move-1.",
    );
    expect(engineClient.requests).toEqual([]);
  });
});
