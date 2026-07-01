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
    const voiceAssetId = resolveReusableVoiceAssetId({
      actionPayload: action.payload,
      assets: this.config.project.toSnapshot().assets,
      fallbackPath: voiceAssetPath,
      idGenerator: this.config.idGenerator,
    });

    upsertVoiceAsset({
      project: this.config.project,
      voiceAssetId,
      actionId,
      voiceAssetPath,
    });
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

function resolveReusableVoiceAssetId(input: {
  actionPayload: ActionPayloadRecord;
  assets: ReturnType<Project["toSnapshot"]>["assets"];
  fallbackPath: string;
  idGenerator: IdGenerator;
}): string {
  const existingActionVoiceAssetId = readString(input.actionPayload.voiceAssetId);

  if (existingActionVoiceAssetId !== null && input.assets.some((asset) => asset.assetId === existingActionVoiceAssetId)) {
    return existingActionVoiceAssetId;
  }

  const existingAssetWithSamePath = input.assets.find((asset) => asset.assetType === "voice" && asset.assetPath === input.fallbackPath);

  if (existingAssetWithSamePath !== undefined) {
    return existingAssetWithSamePath.assetId;
  }

  return input.idGenerator.generate("voice");
}

function upsertVoiceAsset(input: {
  project: Project;
  voiceAssetId: string;
  actionId: string;
  voiceAssetPath: string;
}): void {
  const assetSnapshot = input.project.toSnapshot().assets.find((asset) => asset.assetId === input.voiceAssetId);

  if (assetSnapshot === undefined) {
    input.project.addAsset(
      Asset.create({
        assetId: input.voiceAssetId,
        assetName: `Voice ${input.actionId}`,
        assetType: "voice",
        assetPath: input.voiceAssetPath,
      }),
    );
    return;
  }

  input.project.updateAsset(input.voiceAssetId, (asset) => {
    asset.rename(`Voice ${input.actionId}`);
    asset.changeType("voice");
    asset.changePath(input.voiceAssetPath);
  });
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
