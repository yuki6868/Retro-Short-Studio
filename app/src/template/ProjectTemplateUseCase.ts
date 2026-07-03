import { Action, CharacterInstance, CharacterModel, DeterministicIdGenerator, ProjectTemplate, type IdGenerator, type Project } from "../../../core/src";
import type { ProjectTemplateInitialTrackSnapshot, ProjectTemplateKind, ProjectTemplateSnapshot } from "../../../core/src";
import { Asset, Scene } from "../../../core/src";

export type ProjectTemplateSummaryDto = {
  templateId: string;
  templateName: string;
  description: string;
  kind: ProjectTemplateKind;
  width: number;
  height: number;
  fps: number;
  sceneCount: number;
  initialTracks: ProjectTemplateInitialTrackSnapshot[];
};

export type ProjectTemplateState = {
  templates: ProjectTemplateSummaryDto[];
  selectedTemplateId: string | null;
};

export type CreateProjectFromTemplateInput = {
  templateId: string;
  projectName: string;
};

export type CreateProjectFromTemplateResult = {
  project: Project;
  state: ProjectTemplateState;
};

export type ProjectTemplateUseCaseConfig = {
  templates?: ProjectTemplate[];
  idGenerator: IdGenerator;
};

export class ProjectTemplateUseCase {
  private selectedTemplateId: string | null = null;
  private readonly templates: ProjectTemplate[];

  constructor(private readonly config: ProjectTemplateUseCaseConfig) {
    this.templates = config.templates ?? createBuiltInProjectTemplates();
  }

  get state(): ProjectTemplateState {
    return this.createState();
  }

  listTemplates(): ProjectTemplateSummaryDto[] {
    return this.createState().templates;
  }

  selectTemplate(templateId: string): ProjectTemplateState {
    const normalizedTemplateId = normalizeId(templateId, "templateId");
    this.findTemplateOrThrow(normalizedTemplateId);
    this.selectedTemplateId = normalizedTemplateId;
    return this.createState();
  }

  createProjectFromTemplate(input: CreateProjectFromTemplateInput): CreateProjectFromTemplateResult {
    const template = this.findTemplateOrThrow(normalizeId(input.templateId, "templateId"));
    const project = template.instantiate({
      projectId: this.config.idGenerator.generate("project"),
      projectName: normalizeId(input.projectName, "projectName"),
      generateSceneId: () => this.config.idGenerator.generate("scene"),
      generateCharacterInstanceId: () => this.config.idGenerator.generate("character-instance"),
      generateActionId: () => this.config.idGenerator.generate("action"),
    });

    this.selectedTemplateId = template.toSnapshot().templateId;
    return { project, state: this.createState() };
  }

  private createState(): ProjectTemplateState {
    return {
      templates: this.templates.map(toSummaryDto),
      selectedTemplateId: this.templates.some((template) => template.toSnapshot().templateId === this.selectedTemplateId)
        ? this.selectedTemplateId
        : null,
    };
  }

  private findTemplateOrThrow(templateId: string): ProjectTemplate {
    const template = this.templates.find((currentTemplate) => currentTemplate.toSnapshot().templateId === templateId);

    if (template === undefined) {
      throw new Error(`ProjectTemplate does not exist: ${templateId}.`);
    }

    return template;
  }
}

export function createBuiltInProjectTemplates(): ProjectTemplate[] {
  return [createExplainerShortTemplate(), createStudyWithMeTemplate()];
}

function createExplainerShortTemplate(): ProjectTemplate {
  return ProjectTemplate.create({
    templateId: "project-template-explainer-short",
    templateName: "Explainer Short",
    description: "Opening, body, and closing scenes for character-led explanation videos.",
    kind: "explainer_short",
    settings: { width: 1080, height: 1920, fps: 30 },
    initialTracks: createDefaultInitialTracks("character-template-main"),
    assets: [
      Asset.create({
        assetId: "asset-template-bg-room",
        assetName: "Template Room Background",
        assetType: "background",
        assetPath: "assets/templates/explainer-room.png",
      }).toSnapshot(),
    ],
    characters: [CharacterModel.create({ characterId: "character-template-zundamon", characterName: "Zundamon" }).toSnapshot()],
    scenes: [
      createTemplateScene({ sceneId: "template-scene-opening", sceneName: "Opening", duration: 5, text: "今日のテーマを説明するのだ。" }),
      createTemplateScene({ sceneId: "template-scene-body", sceneName: "Main Explanation", duration: 12, text: "ここに本文の解説を入れるのだ。" }),
      createTemplateScene({ sceneId: "template-scene-closing", sceneName: "Closing", duration: 5, text: "まとめなのだ。" }),
    ],
  });
}

function createStudyWithMeTemplate(): ProjectTemplate {
  return ProjectTemplate.create({
    templateId: "project-template-study-with-me",
    templateName: "Study With Me",
    description: "Quiet timer-oriented scenes with BGM and break placeholders.",
    kind: "study_with_me",
    settings: { width: 1920, height: 1080, fps: 30 },
    initialTracks: [
      { trackId: "effect", label: "Effect", purpose: "Timer and visual emphasis actions." },
      { trackId: "camera", label: "Camera", purpose: "Subtle zoom and pan actions." },
    ],
    assets: [
      Asset.create({
        assetId: "asset-template-bg-desk",
        assetName: "Template Desk Background",
        assetType: "background",
        assetPath: "assets/templates/study-desk.png",
      }).toSnapshot(),
    ],
    characters: [],
    scenes: [
      Scene.create({
        sceneId: "template-scene-study-focus",
        sceneName: "Focus Session",
        duration: 1500,
        backgroundAssetId: "asset-template-bg-desk",
        actions: [
          Action.create({
            actionId: "template-action-study-fade-in",
            actionType: "fade_in",
            startTime: 0,
            endTime: 2,
            targetId: null,
            payload: { opacity: 1 },
          }).toSnapshot(),
          Action.create({
            actionId: "template-action-study-camera",
            actionType: "camera_zoom",
            startTime: 0,
            endTime: 1500,
            targetId: null,
            payload: { zoom: 1.05 },
          }).toSnapshot(),
        ],
      }).toSnapshot(),
      Scene.create({
        sceneId: "template-scene-study-break",
        sceneName: "Break",
        duration: 300,
        backgroundAssetId: "asset-template-bg-desk",
        actions: [
          Action.create({
            actionId: "template-action-break-flash",
            actionType: "flash",
            startTime: 0,
            endTime: 1,
            targetId: null,
            payload: { intensity: 0.2 },
          }).toSnapshot(),
        ],
      }).toSnapshot(),
    ],
  });
}

function createTemplateScene(input: { sceneId: string; sceneName: string; duration: number; text: string }) {
  return Scene.create({
    sceneId: input.sceneId,
    sceneName: input.sceneName,
    duration: input.duration,
    backgroundAssetId: "asset-template-bg-room",
    characters: [
      CharacterInstance.create({
        instanceId: "character-template-main",
        characterId: "character-template-zundamon",
        transform: { x: 0, y: 0, scale: 1, rotation: 0 },
      }).toSnapshot(),
    ],
    actions: [
      Action.create({
        actionId: `${input.sceneId}-talk`,
        actionType: "talk",
        startTime: 0.5,
        endTime: Math.min(input.duration, 4),
        targetId: "character-template-main",
        payload: {
          text: input.text,
          speakerId: "3",
          speakerCharacterId: "character-template-main",
          voiceAssetId: null,
          generatedVoicePath: null,
          generatedVoiceDuration: null,
          lipSyncEnabled: true,
        },
      }).toSnapshot(),
      Action.create({
        actionId: `${input.sceneId}-camera`,
        actionType: "camera_zoom",
        startTime: 0,
        endTime: input.duration,
        targetId: null,
        payload: { zoom: 1.08 },
      }).toSnapshot(),
    ],
  }).toSnapshot();
}

function createDefaultInitialTracks(characterInstanceId: string): ProjectTemplateInitialTrackSnapshot[] {
  return [
    { trackId: `character:${characterInstanceId}`, label: "Character", purpose: "Talk and movement actions for the main character." },
    { trackId: "effect", label: "Effect", purpose: "Flash, fade, and emphasis actions." },
    { trackId: "camera", label: "Camera", purpose: "Camera movement and zoom actions." },
  ];
}

function toSummaryDto(template: ProjectTemplate): ProjectTemplateSummaryDto {
  const snapshot = template.toSnapshot();

  return {
    templateId: snapshot.templateId,
    templateName: snapshot.templateName,
    description: snapshot.description,
    kind: snapshot.kind,
    width: snapshot.settings.width,
    height: snapshot.settings.height,
    fps: snapshot.settings.fps,
    sceneCount: snapshot.scenes.length,
    initialTracks: snapshot.initialTracks.map((track) => ({ ...track })),
  };
}

function normalizeId(value: string, label: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new Error(`ProjectTemplate ${label} is required.`);
  }

  return normalized;
}

export function createDeterministicProjectTemplateUseCase(): ProjectTemplateUseCase {
  return new ProjectTemplateUseCase({ idGenerator: new DeterministicIdGenerator() });
}
