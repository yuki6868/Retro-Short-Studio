import type { ActionSnapshot } from "../action";
import { Scene, type SceneSnapshot } from "../scene";

export type SceneTemplateSnapshot = {
  templateId: string;
  templateName: string;
  sourceSceneId: string;
  scene: Omit<SceneSnapshot, "sceneId" | "sceneName">;
};

export class SceneTemplate {
  private constructor(
    private readonly templateId: string,
    private templateName: string,
    private readonly sourceSceneId: string,
    private readonly scene: Omit<SceneSnapshot, "sceneId" | "sceneName">,
  ) {}

  static create(params: {
    templateId: string;
    templateName: string;
    sourceScene: SceneSnapshot;
  }): SceneTemplate {
    const templateId = normalizeNonEmptyString(params.templateId, "SceneTemplate.templateId");
    const templateName = normalizeNonEmptyString(params.templateName, "SceneTemplate.templateName");
    const sourceSceneId = normalizeNonEmptyString(params.sourceScene.sceneId, "SceneTemplate.sourceSceneId");

    return new SceneTemplate(templateId, templateName, sourceSceneId, copyTemplatedScene(params.sourceScene));
  }

  static restore(snapshot: SceneTemplateSnapshot): SceneTemplate {
    return new SceneTemplate(
      normalizeNonEmptyString(snapshot.templateId, "SceneTemplate.templateId"),
      normalizeNonEmptyString(snapshot.templateName, "SceneTemplate.templateName"),
      normalizeNonEmptyString(snapshot.sourceSceneId, "SceneTemplate.sourceSceneId"),
      {
        duration: normalizePositiveNumber(snapshot.scene.duration, "SceneTemplate.scene.duration"),
        backgroundAssetId: snapshot.scene.backgroundAssetId,
        characters: snapshot.scene.characters.map((character) => ({ ...character, transform: { ...character.transform } })),
        actions: snapshot.scene.actions.map(copyAction),
      },
    );
  }

  rename(templateName: string): void {
    this.templateName = normalizeNonEmptyString(templateName, "SceneTemplate.templateName");
  }

  instantiate(params: {
    sceneId: string;
    sceneName: string;
    generateCharacterInstanceId(): string;
    generateActionId(): string;
  }): Scene {
    const instanceIdByTemplateInstanceId = new Map<string, string>();
    const characters = this.scene.characters.map((character) => {
      const instanceId = params.generateCharacterInstanceId();
      instanceIdByTemplateInstanceId.set(character.instanceId, instanceId);
      return {
        ...character,
        instanceId,
        transform: { ...character.transform },
      };
    });

    const actions = this.scene.actions.map((action) => remapAction(action, params.generateActionId(), instanceIdByTemplateInstanceId));

    return Scene.create({
      sceneId: params.sceneId,
      sceneName: params.sceneName,
      duration: this.scene.duration,
      backgroundAssetId: this.scene.backgroundAssetId,
      characters,
      actions,
    });
  }

  toSnapshot(): SceneTemplateSnapshot {
    return {
      templateId: this.templateId,
      templateName: this.templateName,
      sourceSceneId: this.sourceSceneId,
      scene: {
        duration: this.scene.duration,
        backgroundAssetId: this.scene.backgroundAssetId,
        characters: this.scene.characters.map((character) => ({ ...character, transform: { ...character.transform } })),
        actions: this.scene.actions.map(copyAction),
      },
    };
  }
}

function copyTemplatedScene(scene: SceneSnapshot): Omit<SceneSnapshot, "sceneId" | "sceneName"> {
  return {
    duration: normalizePositiveNumber(scene.duration, "SceneTemplate.scene.duration"),
    backgroundAssetId: scene.backgroundAssetId,
    characters: scene.characters.map((character) => ({ ...character, transform: { ...character.transform } })),
    actions: scene.actions.map(copyAction),
  };
}

function copyAction(action: ActionSnapshot): ActionSnapshot {
  return {
    ...action,
    payload: { ...action.payload },
  };
}

function remapAction(action: ActionSnapshot, actionId: string, instanceIdByTemplateInstanceId: Map<string, string>): ActionSnapshot {
  const targetId = action.targetId === null ? null : instanceIdByTemplateInstanceId.get(action.targetId) ?? action.targetId;
  const payload = { ...action.payload };

  if (typeof payload.speakerCharacterId === "string") {
    payload.speakerCharacterId = instanceIdByTemplateInstanceId.get(payload.speakerCharacterId) ?? payload.speakerCharacterId;
  }

  return {
    ...action,
    actionId,
    targetId,
    payload,
  };
}

function normalizeNonEmptyString(value: string, label: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

function normalizePositiveNumber(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite number.`);
  }

  return value;
}
