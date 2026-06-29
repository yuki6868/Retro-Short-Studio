import type { SceneDto } from "../scene/SceneDto";

export type PreviewRequest = {
  projectId: string;
  scene: SceneDto;
  currentTime: number;
  width: number;
  height: number;
  fps: number;
};

export type PreviewResult = {
  framePath: string | null;
  currentTime: number;
  width: number;
  height: number;
};
