import { Action, type ActionPayloadRecord, type ActionSnapshot, type IdGenerator, type Project, type SceneSnapshot } from "../../../core/src";

export type CreateActionKind = "talk" | "character" | "effect" | "camera";

export type CreateActionInput = {
  sceneId: string;
  kind: CreateActionKind;
  startTime: number;
  duration?: number;
  targetId?: string | null;
  payload?: ActionPayloadRecord;
};

export type DeleteActionInput = {
  sceneId: string;
  actionId: string;
};

export type ActionEditorResult = {
  sceneId: string;
  action: ActionSnapshot;
};

export type ActionEditorUseCaseConfig = {
  project: Project;
  idGenerator: IdGenerator;
};

type ActionDefaults = {
  actionType: string;
  duration: number;
  targetId: string | null;
  payload: ActionPayloadRecord;
};

export class ActionEditorUseCase {
  constructor(private readonly config: ActionEditorUseCaseConfig) {}

  createAction(input: CreateActionInput): ActionEditorResult {
    const sceneId = normalizeId(input.sceneId, "sceneId");
    const scene = this.findSceneOrThrow(sceneId);
    const defaults = createActionDefaults(input.kind);
    const startTime = normalizeFiniteTime(input.startTime, "Action startTime");
    const duration = normalizeDuration(input.duration ?? defaults.duration);
    const endTime = roundActionTime(startTime + duration);

    validateActionFitsScene({ scene, startTime, endTime });

    const action = Action.create({
      actionId: this.config.idGenerator.generate("action"),
      actionType: defaults.actionType,
      startTime,
      endTime,
      targetId: input.targetId ?? defaults.targetId,
      payload: input.payload ?? defaults.payload,
    });

    this.config.project.updateScene(sceneId, (editableScene) => editableScene.addAction(action));

    return {
      sceneId,
      action: action.toSnapshot(),
    };
  }

  deleteAction(input: DeleteActionInput): { sceneId: string; actionId: string } {
    const sceneId = normalizeId(input.sceneId, "sceneId");
    const actionId = normalizeId(input.actionId, "actionId");
    const scene = this.findSceneOrThrow(sceneId);

    if (!scene.actions.some((action) => action.actionId === actionId)) {
      throw new Error(`Action does not exist in scene: ${actionId}.`);
    }

    this.config.project.updateScene(sceneId, (editableScene) => editableScene.removeAction(actionId));

    return { sceneId, actionId };
  }

  private findSceneOrThrow(sceneId: string): SceneSnapshot {
    const scene = this.config.project.toSnapshot().scenes.find((candidate) => candidate.sceneId === sceneId);

    if (scene === undefined) {
      throw new Error(`Scene does not exist: ${sceneId}.`);
    }

    return scene;
  }
}

function createActionDefaults(kind: CreateActionKind): ActionDefaults {
  switch (kind) {
    case "talk":
      return {
        actionType: "talk",
        duration: 3,
        targetId: null,
        payload: { text: "" },
      };
    case "character":
      return {
        actionType: "move",
        duration: 1,
        targetId: null,
        payload: { x: 0, y: 0 },
      };
    case "effect":
      return {
        actionType: "flash",
        duration: 0.6,
        targetId: null,
        payload: { intensity: 0.5 },
      };
    case "camera":
      return {
        actionType: "camera_zoom",
        duration: 1.5,
        targetId: "camera-main",
        payload: { zoom: 1.1 },
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

function normalizeFiniteTime(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a non-negative finite number.`);
  }

  return roundActionTime(value);
}

function normalizeDuration(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Action duration must be a positive finite number.");
  }

  return roundActionTime(value);
}

function validateActionFitsScene(input: { scene: SceneSnapshot; startTime: number; endTime: number }): void {
  if (input.endTime > input.scene.duration) {
    throw new Error(`Action cannot end after the scene duration: ${input.scene.sceneId}.`);
  }
}

function roundActionTime(value: number): number {
  return Number(value.toFixed(6));
}
