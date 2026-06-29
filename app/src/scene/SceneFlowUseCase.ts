import { Scene, type SceneSnapshot } from "../../../core/src";
import type { IdGenerator, Project } from "../../../core/src";
import type { ActionTypeDto, SceneDto } from "../../../shared";

export type AddSceneInput = {
  sceneName: string;
  duration: number;
  backgroundAssetId?: string | null;
};

export type MoveSceneInput = {
  sceneId: string;
  toIndex: number;
};

export type SceneFlowState = {
  scenes: SceneDto[];
  selectedSceneId: string | null;
};

export type SceneFlowUseCaseConfig = {
  project: Project;
  idGenerator: IdGenerator;
};

export class SceneFlowUseCase {
  private selectedSceneId: string | null = null;

  constructor(private readonly config: SceneFlowUseCaseConfig) {}

  get state(): SceneFlowState {
    return this.createState();
  }

  listScenes(): SceneDto[] {
    return this.createScenes();
  }

  addScene(input: AddSceneInput): SceneFlowState {
    const scene = Scene.create({
      sceneId: this.config.idGenerator.generate("scene"),
      sceneName: input.sceneName,
      duration: input.duration,
      backgroundAssetId: input.backgroundAssetId ?? null,
    });

    this.config.project.addScene(scene);
    this.selectedSceneId = scene.toSnapshot().sceneId;
    return this.createState();
  }

  selectScene(sceneId: string): SceneFlowState {
    const normalizedSceneId = normalizeSceneId(sceneId);
    this.assertSceneExists(normalizedSceneId);

    this.selectedSceneId = normalizedSceneId;
    return this.createState();
  }

  deleteScene(sceneId: string): SceneFlowState {
    const normalizedSceneId = normalizeSceneId(sceneId);
    this.assertSceneExists(normalizedSceneId);

    this.config.project.removeScene(normalizedSceneId);

    if (this.selectedSceneId === normalizedSceneId) {
      this.selectedSceneId = this.createScenes()[0]?.sceneId ?? null;
    }

    return this.createState();
  }

  moveScene(input: MoveSceneInput): SceneFlowState {
    const normalizedSceneId = normalizeSceneId(input.sceneId);
    this.assertSceneExists(normalizedSceneId);

    this.config.project.moveScene(normalizedSceneId, input.toIndex);
    this.selectedSceneId = normalizedSceneId;
    return this.createState();
  }

  private createState(): SceneFlowState {
    const scenes = this.createScenes();

    return {
      scenes,
      selectedSceneId: scenes.some((scene) => scene.sceneId === this.selectedSceneId) ? this.selectedSceneId : null,
    };
  }

  private createScenes(): SceneDto[] {
    return this.config.project.toSnapshot().scenes.map(toSceneDto);
  }

  private assertSceneExists(sceneId: string): void {
    if (!this.createScenes().some((scene) => scene.sceneId === sceneId)) {
      throw new Error(`Scene does not exist: ${sceneId}.`);
    }
  }
}

function normalizeSceneId(sceneId: string): string {
  const normalizedSceneId = sceneId.trim();

  if (normalizedSceneId.length === 0) {
    throw new Error("Selected sceneId is required.");
  }

  return normalizedSceneId;
}

function toSceneDto(scene: SceneSnapshot): SceneDto {
  return {
    sceneId: scene.sceneId,
    sceneName: scene.sceneName,
    duration: scene.duration,
    backgroundAssetId: scene.backgroundAssetId,
    characterIds: scene.characters.map((character) => character.characterId),
    actions: scene.actions.map((action) => ({
      actionId: action.actionId,
      actionType: action.actionType as ActionTypeDto,
      startTime: action.startTime,
      endTime: action.endTime,
      targetId: action.targetId,
      payload: action.payload,
    })),
  };
}
