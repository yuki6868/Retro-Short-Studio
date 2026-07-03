import { SceneTemplate, type IdGenerator, type Project } from "../../../core/src";

export type SceneTemplateDto = {
  templateId: string;
  templateName: string;
  sourceSceneId: string;
  duration: number;
  backgroundAssetId: string | null;
  characterCount: number;
  actionCount: number;
};

export type SceneTemplateState = {
  templates: SceneTemplateDto[];
  selectedTemplateId: string | null;
};

export type SaveSceneAsTemplateInput = {
  sceneId: string;
  templateName: string;
};

export type CreateSceneFromTemplateInput = {
  templateId: string;
  sceneName?: string;
};

export type CreateSceneFromTemplateResult = {
  sceneId: string;
  state: SceneTemplateState;
};

export type SceneTemplateUseCaseConfig = {
  project: Project;
  idGenerator: IdGenerator;
};

export class SceneTemplateUseCase {
  private selectedTemplateId: string | null = null;

  constructor(private readonly config: SceneTemplateUseCaseConfig) {}

  get state(): SceneTemplateState {
    return this.createState();
  }

  saveSceneAsTemplate(input: SaveSceneAsTemplateInput): SceneTemplateState {
    const scene = this.findSceneOrThrow(normalizeId(input.sceneId, "sceneId"));
    const template = SceneTemplate.create({
      templateId: this.config.idGenerator.generate("scene-template"),
      templateName: normalizeId(input.templateName, "templateName"),
      sourceScene: scene,
    });

    this.config.project.addSceneTemplate(template);
    this.selectedTemplateId = template.toSnapshot().templateId;
    return this.createState();
  }

  createSceneFromTemplate(input: CreateSceneFromTemplateInput): CreateSceneFromTemplateResult {
    const template = this.findTemplateOrThrow(normalizeId(input.templateId, "templateId"));
    const templateSnapshot = template.toSnapshot();
    const scene = template.instantiate({
      sceneId: this.config.idGenerator.generate("scene"),
      sceneName: normalizeSceneName(input.sceneName, templateSnapshot.templateName),
      generateCharacterInstanceId: () => this.config.idGenerator.generate("character-instance"),
      generateActionId: () => this.config.idGenerator.generate("action"),
    });

    this.config.project.addScene(scene);
    this.selectedTemplateId = templateSnapshot.templateId;
    return { sceneId: scene.toSnapshot().sceneId, state: this.createState() };
  }

  deleteTemplate(templateId: string): SceneTemplateState {
    const normalizedTemplateId = normalizeId(templateId, "templateId");
    this.findTemplateOrThrow(normalizedTemplateId);
    this.config.project.removeSceneTemplate(normalizedTemplateId);

    if (this.selectedTemplateId === normalizedTemplateId) {
      this.selectedTemplateId = this.config.project.toSnapshot().sceneTemplates?.[0]?.templateId ?? null;
    }

    return this.createState();
  }

  private createState(): SceneTemplateState {
    const templates = this.config.project.toSnapshot().sceneTemplates ?? [];

    return {
      templates: templates.map((template) => ({
        templateId: template.templateId,
        templateName: template.templateName,
        sourceSceneId: template.sourceSceneId,
        duration: template.scene.duration,
        backgroundAssetId: template.scene.backgroundAssetId,
        characterCount: template.scene.characters.length,
        actionCount: template.scene.actions.length,
      })),
      selectedTemplateId: templates.some((template) => template.templateId === this.selectedTemplateId)
        ? this.selectedTemplateId
        : null,
    };
  }

  private findSceneOrThrow(sceneId: string) {
    const scene = this.config.project.toSnapshot().scenes.find((candidate) => candidate.sceneId === sceneId);

    if (scene === undefined) {
      throw new Error(`Scene does not exist: ${sceneId}.`);
    }

    return scene;
  }

  private findTemplateOrThrow(templateId: string): SceneTemplate {
    const snapshot = this.config.project.toSnapshot().sceneTemplates?.find((candidate) => candidate.templateId === templateId);

    if (snapshot === undefined) {
      throw new Error(`SceneTemplate does not exist: ${templateId}.`);
    }

    return SceneTemplate.restore(snapshot);
  }
}

function normalizeId(value: string, name: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new Error(`SceneTemplate ${name} is required.`);
  }

  return normalized;
}

function normalizeSceneName(sceneName: string | undefined, templateName: string): string {
  const normalized = sceneName?.trim();
  return normalized === undefined || normalized.length === 0 ? `${templateName} Copy` : normalized;
}
