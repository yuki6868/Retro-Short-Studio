import { describe, expect, it } from "vitest";
import type { Renderer, RenderContext, RenderFrame } from "../../shared";
import { createDefaultDrawableTransform } from "../../shared";

class RecordingRenderer implements Renderer {
  public receivedContext: RenderContext | null = null;

  async renderFrame(context: RenderContext): Promise<RenderFrame> {
    this.receivedContext = context;

    return {
      frameIndex: 12,
      time: context.currentTime,
      width: context.viewport.width,
      height: context.viewport.height,
      format: "png",
      path: "renders/frame_0012.png",
      buffer: null,
    };
  }
}

describe("Renderer boundary", () => {
  it("defines a renderer interface without exposing a concrete rendering engine", async () => {
    const renderer: Renderer = new RecordingRenderer();
    const context = createRenderContext();

    const frame = await renderer.renderFrame(context);

    expect(frame).toEqual({
      frameIndex: 12,
      time: 1.2,
      width: 1280,
      height: 720,
      format: "png",
      path: "renders/frame_0012.png",
      buffer: null,
    });
    expect((renderer as RecordingRenderer).receivedContext).toEqual(context);
  });

  it("represents renderable objects as Drawable values", () => {
    const transform = createDefaultDrawableTransform();

    expect(transform).toEqual({
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      opacity: 1,
    });
  });
});

function createRenderContext(): RenderContext {
  return {
    projectId: "project-1",
    scene: {
      sceneId: "scene-1",
      sceneName: "Opening",
      duration: 5,
      backgroundAssetId: "background-1",
      characterIds: [],
      actions: [],
    },
    currentTime: 1.2,
    fps: 30,
    viewport: {
      width: 1280,
      height: 720,
    },
    activeActions: [],
    drawables: [
      {
        drawableId: "background-layer",
        kind: "background",
        assetId: "background-1",
        layer: 0,
        transform: createDefaultDrawableTransform(),
        payload: {},
      },
    ],
  };
}
