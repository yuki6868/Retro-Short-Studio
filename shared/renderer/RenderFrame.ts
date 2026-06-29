export type RenderFrameFormat = "png" | "raw";

export type RenderFrame = {
  frameIndex: number;
  time: number;
  width: number;
  height: number;
  format: RenderFrameFormat;
  path: string | null;
  buffer: Uint8Array | null;
};
