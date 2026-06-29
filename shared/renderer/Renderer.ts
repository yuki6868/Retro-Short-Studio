import type { RenderContext } from "./RenderContext";
import type { RenderFrame } from "./RenderFrame";

export interface Renderer {
  renderFrame(context: RenderContext): Promise<RenderFrame>;
}
