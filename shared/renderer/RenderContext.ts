import type { SceneDto } from "../dto";
import type { Drawable } from "./Drawable";

export type RenderViewport = {
  width: number;
  height: number;
};

export type RenderEvaluatedAction = {
  actionId: string;
  actionType: string;
  startTime: number;
  endTime: number;
  targetId: string;
  payload: Record<string, unknown>;
  elapsedTime: number;
  progress: number;
};

export type RenderContext = {
  projectId: string;
  scene: SceneDto;
  currentTime: number;
  fps: number;
  viewport: RenderViewport;
  activeActions: RenderEvaluatedAction[];
  drawables: Drawable[];
};
