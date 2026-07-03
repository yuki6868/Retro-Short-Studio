import { Action, type ActionSnapshot } from "../action";
import { Asset, type AssetSnapshot } from "../asset";
import { CharacterModel, type CharacterModelSnapshot } from "../character";
import { Project, type ProjectSnapshot } from "../project";
import { Scene, type SceneSnapshot } from "../scene";
import type { ProjectSettingsValues } from "../project/valueObjects";

export type ProjectTemplateKind = "explainer_short" | "study_with_me" | "custom";

export type ProjectTemplateInitialTrackSnapshot = {
  trackId: string;
  label: string;
  purpose: string;
};

export type ProjectTemplateSnapshot = {
  templateId: string;
  templateName: string;
  description: string;
  kind: ProjectTemplateKind;
  settings: ProjectSettingsValues;
  initialTracks: ProjectTemplateInitialTrackSnapshot[];
  assets: AssetSnapshot[];
  characters: CharacterModelSnapshot[];
  scenes: SceneSnapshot[];
};

export class ProjectTemplate {
  private constructor(private readonly snapshot: ProjectTemplateSnapshot) {}

  static create(snapshot: ProjectTemplateSnapshot): ProjectTemplate {
    return new ProjectTemplate(copyAndValidateSnapshot(snapshot));
  }

  static restore(snapshot: ProjectTemplateSnapshot): ProjectTemplate {
    return ProjectTemplate.create(snapshot);
  }

  instantiate(params: {
    projectId: string;
    projectName: string;
    generateSceneId(): string;
    generateCharacterInstanceId(): string;
    generateActionId(): string;
  }): Project {
    const project = Project.create({
      projectId: normalizeNonEmptyString(params.projectId, "ProjectTemplate.projectId"),
      projectName: normalizeNonEmptyString(params.projectName, "ProjectTemplate.projectName"),
      settings: this.snapshot.settings,
    });

    this.snapshot.assets.forEach((asset) => project.addAsset(Asset.restore(asset)));
    this.snapshot.characters.forEach((character) => project.addCharacterModel(CharacterModel.restore(character)));

    this.snapshot.scenes.forEach((scene) => {
      const instanceIdByTemplateInstanceId = new Map<string, string>();
      const characters = scene.characters.map((character) => {
        const instanceId = params.generateCharacterInstanceId();
        instanceIdByTemplateInstanceId.set(character.instanceId, instanceId);
        return {
          ...character,
          instanceId,
          transform: { ...character.transform },
        };
      });

      project.addScene(
        Scene.create({
          sceneId: params.generateSceneId(),
          sceneName: scene.sceneName,
          duration: scene.duration,
          backgroundAssetId: scene.backgroundAssetId,
          characters,
          actions: scene.actions.map((action) => remapAction(action, params.generateActionId(), instanceIdByTemplateInstanceId)),
        }),
      );
    });

    return project;
  }

  toSnapshot(): ProjectTemplateSnapshot {
    return copyAndValidateSnapshot(this.snapshot);
  }
}

export function projectTemplateSnapshotFromProject(params: {
  templateId: string;
  templateName: string;
  description?: string;
  kind?: ProjectTemplateKind;
  initialTracks?: ProjectTemplateInitialTrackSnapshot[];
  project: ProjectSnapshot;
}): ProjectTemplateSnapshot {
  return copyAndValidateSnapshot({
    templateId: params.templateId,
    templateName: params.templateName,
    description: params.description ?? "",
    kind: params.kind ?? "custom",
    settings: params.project.settings,
    initialTracks: params.initialTracks ?? [],
    assets: params.project.assets,
    characters: params.project.characters,
    scenes: params.project.scenes,
  });
}

function copyAndValidateSnapshot(snapshot: ProjectTemplateSnapshot): ProjectTemplateSnapshot {
  const templateId = normalizeNonEmptyString(snapshot.templateId, "ProjectTemplate.templateId");
  const templateName = normalizeNonEmptyString(snapshot.templateName, "ProjectTemplate.templateName");
  const description = typeof snapshot.description === "string" ? snapshot.description : "";
  const kind = normalizeKind(snapshot.kind);
  const settings = {
    width: normalizePositiveInteger(snapshot.settings.width, "ProjectTemplate.settings.width"),
    height: normalizePositiveInteger(snapshot.settings.height, "ProjectTemplate.settings.height"),
    fps: normalizePositiveInteger(snapshot.settings.fps, "ProjectTemplate.settings.fps"),
  };

  return {
    templateId,
    templateName,
    description,
    kind,
    settings,
    initialTracks: snapshot.initialTracks.map((track, index) => ({
      trackId: normalizeNonEmptyString(track.trackId, `ProjectTemplate.initialTracks[${index}].trackId`),
      label: normalizeNonEmptyString(track.label, `ProjectTemplate.initialTracks[${index}].label`),
      purpose: normalizeNonEmptyString(track.purpose, `ProjectTemplate.initialTracks[${index}].purpose`),
    })),
    assets: snapshot.assets.map((asset) => Asset.restore(asset).toSnapshot()),
    characters: snapshot.characters.map((character) => CharacterModel.restore(character).toSnapshot()),
    scenes: snapshot.scenes.map((scene) => Scene.restore(scene).toSnapshot()),
  };
}

function normalizeKind(kind: string): ProjectTemplateKind {
  if (kind === "explainer_short" || kind === "study_with_me" || kind === "custom") {
    return kind;
  }

  throw new Error(`ProjectTemplate.kind is not supported: ${kind}.`);
}

function remapAction(action: ActionSnapshot, actionId: string, instanceIdByTemplateInstanceId: Map<string, string>): ActionSnapshot {
  const targetId = action.targetId === null ? null : instanceIdByTemplateInstanceId.get(action.targetId) ?? action.targetId;
  const payload = { ...action.payload };

  if (typeof payload.speakerCharacterId === "string") {
    payload.speakerCharacterId = instanceIdByTemplateInstanceId.get(payload.speakerCharacterId) ?? payload.speakerCharacterId;
  }

  return Action.create({
    actionId,
    actionType: action.actionType,
    startTime: action.startTime,
    endTime: action.endTime,
    targetId,
    payload,
  }).toSnapshot();
}

function normalizeNonEmptyString(value: string, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} is required.`);
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

function normalizePositiveInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return value;
}
