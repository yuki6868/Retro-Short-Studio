import {
  Action,
  Asset,
  CharacterModel,
  CryptoRandomIdGenerator,
  DeterministicIdGenerator,
  Project,
  Scene,
  type IdGenerator,
} from "../../../core/src";
import {
  ActionEditorUseCase,
  AssetLibraryUseCase,
  GenerateVoiceUseCase,
  InspectorUseCase,
  PyxelPreviewEngineClient,
  SceneFlowUseCase,
  TimelineUseCase,
} from "../../../app/src";
import type { EngineClient } from "../../../shared";
import { loadBrowserProject, saveBrowserProject } from "./BrowserProjectPersistence";

export type StudioUseCases = {
  assetLibrary: AssetLibraryUseCase;
  sceneFlow: SceneFlowUseCase;
  inspector: InspectorUseCase;
  timeline: TimelineUseCase;
  actionEditor: ActionEditorUseCase;
  generateVoice: GenerateVoiceUseCase;
};

export type ProjectSessionConfig = {
  project?: Project;
  idGenerator?: IdGenerator;
  engineClient?: EngineClient;
};

export class ProjectSession {
  readonly project: Project;
  readonly useCases: StudioUseCases;
  readonly engineClient: EngineClient;
  private didBootstrapSelection = false;

  constructor(config: ProjectSessionConfig = {}) {
    this.project = config.project ?? loadBrowserProject() ?? createDefaultStudioProject();
    const idGenerator = config.idGenerator ?? new CryptoRandomIdGenerator();
    this.engineClient = config.engineClient ?? new PyxelPreviewEngineClient();

    this.useCases = {
      assetLibrary: new AssetLibraryUseCase({ project: this.project, idGenerator }),
      sceneFlow: new SceneFlowUseCase({ project: this.project, idGenerator }),
      inspector: new InspectorUseCase({ project: this.project }),
      timeline: new TimelineUseCase({ project: this.project }),
      actionEditor: new ActionEditorUseCase({ project: this.project, idGenerator }),
      generateVoice: new GenerateVoiceUseCase({
        project: this.project,
        engineClient: this.engineClient,
        idGenerator,
      }),
    };
  }

  bootstrapSelection(): void {
    if (this.didBootstrapSelection) {
      return;
    }

    const firstSceneId = this.project.toSnapshot().scenes[0]?.sceneId ?? null;

    if (firstSceneId !== null) {
      this.useCases.sceneFlow.selectScene(firstSceneId);
      this.useCases.timeline.showScene(firstSceneId);
      this.useCases.inspector.selectScene(firstSceneId);
    }

    this.didBootstrapSelection = true;
  }

  persist(): void {
    saveBrowserProject(this.project);
  }
}

export function createDefaultStudioProject(): Project {
  const project = Project.create({
    projectId: "project-local-preview",
    projectName: "Local Preview",
    settings: { width: 1280, height: 720, fps: 30 },
  });

  project.addAsset(
    Asset.create({
      assetId: "asset-background-room",
      assetName: "Retro Room Background",
      assetType: "background",
      assetPath: "assets/backgrounds/retro-room.png",
    }),
  );
  project.addCharacterModel(
    CharacterModel.create({
      characterId: "character-zundamon",
      characterName: "Zundamon",
    }),
  );
  project.addScene(
    Scene.create({
      sceneId: "scene-opening",
      sceneName: "Opening",
      duration: 8,
      backgroundAssetId: "asset-background-room",
      actions: [
        Action.create({
          actionId: "action-talk-opening",
          actionType: "talk",
          startTime: 0.5,
          endTime: 2.5,
          targetId: "character-zundamon",
          payload: {
            text: "今日のテーマを説明するのだ。",
            speakerId: "3",
            speakerCharacterId: "character-zundamon",
            voiceAssetId: null,
            generatedVoicePath: null,
            generatedVoiceDuration: null,
            lipSyncEnabled: true,
          },
        }).toSnapshot(),
        Action.create({
          actionId: "action-character-move",
          actionType: "move",
          startTime: 2.5,
          endTime: 4,
          targetId: "character-zundamon",
          payload: { x: 80, y: 0 },
        }).toSnapshot(),
        Action.create({
          actionId: "action-flash-emphasis",
          actionType: "flash",
          startTime: 4.2,
          endTime: 4.8,
          targetId: null,
          payload: { intensity: 0.5 },
        }).toSnapshot(),
        Action.create({
          actionId: "action-camera-zoom",
          actionType: "camera_zoom",
          startTime: 5,
          endTime: 7,
          targetId: null,
          payload: { zoom: 1.15 },
        }).toSnapshot(),
      ],
    }),
  );

  return project;
}

export function createDeterministicProjectSession(): ProjectSession {
  return new ProjectSession({ idGenerator: new DeterministicIdGenerator() });
}
