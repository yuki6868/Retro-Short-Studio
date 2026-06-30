import { describe, expect, it } from "vitest";

import { DefaultPreviewRenderFrameBuilder, PyxelPreviewEngineClient, type PreviewFrameTransport, type PreviewRenderFramePayload } from "../../app/src";
import type { EngineResult, PreviewRequest, PreviewResult } from "../../shared";

describe("PyxelPreviewEngineClient", () => {
  it("converts project preview data to render-frame payload and sends it to a transport", async () => {
    const transport = new RecordingTransport();
    const client = new PyxelPreviewEngineClient({ commandId: "cmd-pyxel-preview", transport });

    const result = await client.preview(createPreviewRequest(1));

    expect(result.ok).toBe(true);
    expect(result.payload?.framePath).toMatch(/^data:image\/png;base64,/);
    expect(transport.lastFrame?.background?.path).toBe("assets/backgrounds/opening.png");
    expect(transport.lastFrame?.characters[0]?.path).toBe("assets/characters/zunda/normal.png");
    expect(transport.lastFrame?.textOverlays.some((overlay) => overlay.text.includes("Hello Pyxel"))).toBe(true);
    expect(transport.lastFrame?.activeActionTypes).toEqual(["talk"]);
  });

  it("uses a frame builder strategy instead of frontend SVG rendering", () => {
    const frame = new DefaultPreviewRenderFrameBuilder().build(createPreviewRequest(4));

    expect(frame.activeActionTypes).toEqual([]);
    expect(JSON.stringify(frame)).not.toContain("<svg");
  });
});

class RecordingTransport implements PreviewFrameTransport {
  lastFrame: PreviewRenderFramePayload | null = null;

  async sendPreviewFrame(commandId: string, frame: PreviewRenderFramePayload): Promise<EngineResult<PreviewResult>> {
    this.lastFrame = frame;
    return {
      commandId,
      ok: true,
      payload: {
        framePath: "data:image/png;base64,AAAA",
        currentTime: frame.currentTime,
        width: frame.width,
        height: frame.height,
      },
      error: null,
    };
  }
}

function createPreviewRequest(currentTime: number): PreviewRequest {
  return {
    projectId: "project-1",
    scene: {
      sceneId: "scene-1",
      sceneName: "Opening",
      duration: 5,
      backgroundAssetId: "asset-bg-1",
      characterIds: ["character-zundamon"],
      actions: [
        {
          actionId: "action-talk-1",
          actionType: "talk",
          startTime: 0,
          endTime: 2,
          targetId: "character-zundamon",
          payload: { text: "Hello Pyxel" },
        },
      ],
    },
    assets: [
      {
        assetId: "asset-bg-1",
        assetName: "Opening Background",
        assetType: "background",
        assetPath: "assets/backgrounds/opening.png",
      },
      {
        assetId: "asset-character-1",
        assetName: "Zundamon normal",
        assetType: "character_image",
        assetPath: "assets/characters/zunda/normal.png",
      },
    ],
    characters: [
      {
        characterId: "character-zundamon",
        characterName: "Zundamon",
        imageMapId: null,
      },
    ],
    currentTime,
    width: 1280,
    height: 720,
    fps: 30,
  };
}
