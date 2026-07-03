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
    expect(transport.lastFrame?.background?.path).toBe("projects/project-1/assets/backgrounds/opening.png");
    expect(transport.lastFrame?.characters[0]?.path).toBe("projects/project-1/assets/characters/zunda/normal.png");
    expect(transport.lastFrame?.textOverlays.some((overlay) => overlay.text.includes("Hello Pyxel"))).toBe(true);
    expect(transport.lastFrame?.activeActionTypes).toEqual(["talk"]);
  });

  it("uses a frame builder strategy instead of frontend SVG rendering", () => {
    const frame = new DefaultPreviewRenderFrameBuilder().build(createPreviewRequest(4));

    expect(frame.activeActionTypes).toEqual([]);
    expect(JSON.stringify(frame)).not.toContain("<svg");
  });

  it("resolves CharacterImageMap assets before falling back to the first character image asset", () => {
    const request = createPreviewRequest(1);
    request.assets = [
      ...(request.assets ?? []),
      {
        assetId: "asset-character-map-neutral",
        assetName: "Zundamon mapped neutral",
        assetType: "character_image",
        assetPath: "assets/characters/zunda/mapped-neutral.png",
      },
    ];
    request.characters = [
      {
        characterId: "character-zundamon",
        characterName: "Zundamon",
        defaultExpression: "neutral",
        defaultEye: "open",
        defaultMouth: "closed",
        defaultMotion: "idle",
        imageMap: {
          expression: { neutral: "asset-character-map-neutral" },
          eye: {},
          mouth: {},
          motion: {},
        },
        imageMapId: "character-zundamon",
      },
    ];

    const frame = new DefaultPreviewRenderFrameBuilder().build(request);

    expect(frame.characters[0]?.path).toBe("projects/project-1/assets/characters/zunda/mapped-neutral.png");
  });

  it("uses an exact CharacterVariant image before separated expression, mouth, or eye fallbacks", () => {
    const request = createPreviewRequest(1);
    request.assets = [
      ...(request.assets ?? []),
      {
        assetId: "asset-expression-happy",
        assetName: "Expression happy",
        assetType: "character_image",
        assetPath: "assets/characters/zunda/expression-happy.png",
      },
      {
        assetId: "asset-variant-happy-open",
        assetName: "Variant happy open",
        assetType: "character_image",
        assetPath: "assets/characters/zunda/variant-happy-open.png",
      },
    ];
    request.characters = [
      {
        characterId: "character-zundamon",
        characterName: "Zundamon",
        defaultExpression: "happy",
        defaultEye: "open",
        defaultMouth: "open",
        defaultMotion: "idle",
        imageMap: {
          expression: { happy: "asset-expression-happy" },
          eye: {},
          mouth: {},
          motion: {},
          variant: {
            "expression=happy|eye=open|mouth=open|motion=idle": "asset-variant-happy-open",
          },
        },
        imageMapId: "character-zundamon",
      },
    ];

    const frame = new DefaultPreviewRenderFrameBuilder().build(request);

    expect(frame.characters[0]?.path).toBe("projects/project-1/assets/characters/zunda/variant-happy-open.png");
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
