import type { SceneDto } from "../scene/SceneDto";

export type RenderRequest = {
  projectId: string;
  scene: SceneDto;
  outputDirectory: string;
  fps: number;
  width: number;
  height: number;
};

export type RenderResult = {
  framePaths: string[];
  outputDirectory: string;
};
