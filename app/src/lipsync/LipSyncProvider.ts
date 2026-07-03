import { Action, TalkAction, type MouthCueSnapshot, type Project } from "../../../core/src";

export type LipSyncRequest = {
  projectId: string;
  sceneId: string;
  talkActionId: string;
  audioPath: string;
  duration: number;
};

export type LipSyncResult = {
  mouthCues: MouthCueSnapshot[];
};

export interface LipSyncProvider {
  generate(request: LipSyncRequest): Promise<LipSyncResult>;
}

export type GenerateLipSyncInput = {
  sceneId: string;
  actionId: string;
  audioPath?: string;
};

export type GenerateLipSyncResult = {
  sceneId: string;
  actionId: string;
  mouthCues: MouthCueSnapshot[];
};

export type GenerateLipSyncForTalkActionUseCaseConfig = {
  project: Project;
  lipSyncProvider: LipSyncProvider;
};

export class GenerateLipSyncForTalkActionUseCase {
  constructor(private readonly config: GenerateLipSyncForTalkActionUseCaseConfig) {}

  async generateForTalkAction(input: GenerateLipSyncInput): Promise<GenerateLipSyncResult> {
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
      throw new Error(`Lip sync can only be generated for talk actions: ${actionId}.`);
    }

    const talkAction = TalkAction.fromAction(Action.restore(action));
    const talkSnapshot = talkAction.toSnapshot();
    const audioPath = normalizeOptionalAudioPath(input.audioPath ?? readString(talkSnapshot.payload.generatedVoicePath) ?? resolveVoiceAssetPath(projectSnapshot.assets, talkSnapshot.payload.voiceAssetId));
    const duration = normalizeDuration(talkSnapshot.payload.generatedVoiceDuration ?? action.endTime - action.startTime);
    const result = audioPath === null
      ? { mouthCues: [] }
      : await this.config.lipSyncProvider.generate({
          projectId: projectSnapshot.projectId,
          sceneId,
          talkActionId: actionId,
          audioPath,
          duration,
        });

    const mouthCues = result.mouthCues.map((cue) => ({ ...cue }));

    this.config.project.updateScene(sceneId, (editableScene) => {
      editableScene.updateAction(actionId, (editableAction) => {
        const editableTalkAction = TalkAction.fromAction(editableAction);
        editableTalkAction.updateMouthCues(mouthCues);
        editableAction.replacePayload(editableTalkAction.toSnapshot().payload);
      });
    });

    return {
      sceneId,
      actionId,
      mouthCues,
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

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function resolveVoiceAssetPath(assets: ReturnType<Project["toSnapshot"]>["assets"], voiceAssetId: string | null): string | null {
  if (voiceAssetId === null) {
    return null;
  }

  return assets.find((asset) => asset.assetId === voiceAssetId && asset.assetType === "voice")?.assetPath ?? null;
}

function normalizeOptionalAudioPath(value: string | null): string | null {
  if (value === null || value.trim().length === 0) {
    return null;
  }

  return value.trim();
}

function normalizeDuration(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("LipSyncRequest duration must be a non-negative number.");
  }

  return value;
}
