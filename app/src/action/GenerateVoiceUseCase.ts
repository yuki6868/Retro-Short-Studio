import { Asset, TalkAction, type ActionPayloadRecord, type IdGenerator, type Project } from "../../../core/src";
import type { EngineClient, VoiceRequest, VoiceResult } from "../../../shared";

export type GenerateVoiceInput = {
  sceneId: string;
  actionId: string;
  speakerId?: string;
  outputDirectory?: string;
};

export type GenerateVoiceResult = {
  sceneId: string;
  actionId: string;
  voiceAssetId: string;
  voiceAssetPath: string;
  duration: number;
};

export type GenerateVoiceUseCaseConfig = {
  project: Project;
  engineClient: EngineClient;
  idGenerator: IdGenerator;
  defaultSpeakerId?: string;
  defaultOutputDirectory?: string;
};

export class GenerateVoiceUseCase {
  constructor(private readonly config: GenerateVoiceUseCaseConfig) {}

  async generateForTalkAction(input: GenerateVoiceInput): Promise<GenerateVoiceResult> {
    const sceneId = normalizeId(input.sceneId, "sceneId");
    const actionId = normalizeId(input.actionId, "actionId");
    const projectSnapshot = this.config.project.toSnapshot();
    const scene = projectSnapshot.scenes.find((candidate) => candidate.sceneId === sceneId);

    if (scene === undefined) {
      throw new Error(`Scene does not exist: ${sceneId}.`);
    }

    const action = scene.actions.find((candidate) => candidate.actionId === actionId);

    if (action === undefined) {
      throw new Error(`Action does not exist in scene ${sceneId}: ${actionId}.`);
    }

    if (action.actionType !== "talk") {
      throw new Error(`Voice can only be generated for talk actions: ${actionId}.`);
    }

    const text = normalizeText(action.payload.text);
    const speakerId = normalizeId(input.speakerId ?? readString(action.payload.speakerId) ?? this.config.defaultSpeakerId ?? "3", "speakerId");
    const voiceAssetId = this.config.idGenerator.generate("voice");
    const outputPath = buildVoiceOutputPath(input.outputDirectory ?? this.config.defaultOutputDirectory ?? "projects/voices", actionId);
    const request: VoiceRequest = {
      projectId: projectSnapshot.projectId,
      talkActionId: actionId,
      text,
      speakerId,
      outputPath,
    };

    const engineResult = await this.config.engineClient.generateVoice(request);

    if (!engineResult.ok || engineResult.payload === null) {
      throw new Error(engineResult.error ?? "Voice generation failed.");
    }

    const voiceResult = engineResult.payload;
    const voiceAssetPath = normalizeVoicePath(voiceResult);
    const duration = normalizeDuration(voiceResult.duration);

    this.config.project.addAsset(
      Asset.create({
        assetId: voiceAssetId,
        assetName: `Voice ${actionId}`,
        assetType: "voice",
        assetPath: voiceAssetPath,
      }),
    );
    this.config.project.updateScene(sceneId, (editableScene) => {
      editableScene.updateAction(actionId, (editableAction) => {
        const talkAction = TalkAction.fromAction(editableAction);
        talkAction.updateVoice({
          speakerId,
          voiceAssetId,
          generatedVoicePath: voiceAssetPath,
          generatedVoiceDuration: duration,
        });
        editableAction.replacePayload(talkAction.toSnapshot().payload);
      });
    });

    return {
      sceneId,
      actionId,
      voiceAssetId,
      voiceAssetPath,
      duration,
    };
  }
}

function normalizeId(value: string, name: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new Error(`${name} is required.`);
  }

  return normalized;
}

function normalizeText(value: ActionPayloadRecord[string]): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("TalkAction text is required before generating voice.");
  }

  return value;
}

function readString(value: ActionPayloadRecord[string]): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function buildVoiceOutputPath(outputDirectory: string, actionId: string): string {
  const normalizedDirectory = outputDirectory.trim().replace(/\/+$/u, "");

  if (normalizedDirectory.length === 0) {
    throw new Error("Voice outputDirectory is required.");
  }

  return `${normalizedDirectory}/${actionId}.wav`;
}

function normalizeVoicePath(result: VoiceResult): string {
  const normalized = result.wavPath.trim();

  if (normalized.length === 0) {
    throw new Error("VoiceResult.wavPath is required.");
  }

  return normalized;
}

function normalizeDuration(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return value;
}
