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
    const request = createPreviewRequest(4);
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

  it("uses CharacterImageMap.findAsset through the current variant selection", () => {
    const request = createPreviewRequest(4);
    request.assets = [
      ...(request.assets ?? []),
      {
        assetId: "asset-expression-happy",
        assetName: "Expression happy",
        assetType: "character_image",
        assetPath: "assets/characters/zunda/expression-happy.png",
      },
      {
        assetId: "asset-variant-angry-closed-open",
        assetName: "Variant angry closed open",
        assetType: "character_image",
        assetPath: "assets/characters/zunda/variant-angry-closed-open.png",
      },
    ];
    request.characters = [
      {
        characterId: "character-zundamon",
        characterName: "Zundamon",
        defaultExpression: "happy",
        defaultEye: "open",
        defaultMouth: "closed",
        defaultMotion: "idle",
        currentVariant: {
          expression: "angry",
          eye: "closed",
          mouth: "open",
        },
        imageMap: {
          expression: { happy: "asset-expression-happy" },
          eye: {},
          mouth: {},
          motion: {},
          variant: {
            "expression=angry|eye=closed|mouth=open|motion=idle": "asset-variant-angry-closed-open",
          },
        },
        imageMapId: "character-zundamon",
      },
    ];

    const frame = new DefaultPreviewRenderFrameBuilder().build(request);

    expect(frame.characters[0]?.path).toBe("projects/project-1/assets/characters/zunda/variant-angry-closed-open.png");
  });


  it("applies talk mouth and blink eye animation before resolving CharacterImageMap assets", () => {
    const request = createPreviewRequest(3.89);
    request.scene.actions = [
      {
        actionId: "action-talk-1",
        actionType: "talk",
        startTime: 3,
        endTime: 5,
        targetId: "character-zundamon",
        payload: { text: "Hello Pyxel" },
      },
    ];
    request.assets = [
      ...(request.assets ?? []),
      {
        assetId: "asset-happy-closed-open",
        assetName: "Happy blink talking",
        assetType: "character_image",
        assetPath: "assets/characters/zunda/happy-blink-talking.png",
      },
    ];
    request.characters = [
      {
        characterId: "character-zundamon",
        characterName: "Zundamon",
        defaultExpression: "happy",
        defaultEye: "open",
        defaultMouth: "closed",
        defaultMotion: "idle",
        currentVariant: {
          expression: "happy",
          eye: "open",
          mouth: "closed",
        },
        imageMap: {
          expression: {},
          eye: {},
          mouth: {},
          motion: {},
          variant: {
            "expression=happy|eye=closed|mouth=half|motion=idle": "asset-happy-closed-open",
          },
        },
        imageMapId: "character-zundamon",
      },
    ];

    const frame = new DefaultPreviewRenderFrameBuilder().build(request);

    expect(frame.characters[0]?.path).toBe("projects/project-1/assets/characters/zunda/happy-blink-talking.png");
  });


  it("uses Talk Action mouthCues to switch the mouth during preview", () => {
    const request = createPreviewRequest(1.15);
    request.scene.actions = [
      {
        actionId: "action-talk-1",
        actionType: "talk",
        startTime: 1,
        endTime: 2,
        targetId: "character-zundamon",
        payload: {
          text: "Hello Pyxel",
          generatedVoicePath: "projects/project-1/voices/action-talk-1.wav",
          mouthCues: [
            { startTime: 0, endTime: 0.1, mouth: "closed" },
            { startTime: 0.1, endTime: 0.3, mouth: "open" },
          ],
        },
      },
    ];
    request.assets = [
      ...(request.assets ?? []),
      {
        assetId: "asset-cue-open",
        assetName: "Cue open mouth",
        assetType: "character_image",
        assetPath: "assets/characters/zunda/cue-open.png",
      },
    ];
    request.characters = [
      {
        characterId: "character-zundamon",
        characterName: "Zundamon",
        defaultExpression: "happy",
        defaultEye: "open",
        defaultMouth: "closed",
        defaultMotion: "idle",
        currentVariant: { expression: "happy", eye: "open", mouth: "closed" },
        imageMap: {
          expression: {},
          eye: {},
          mouth: {},
          motion: {},
          variant: {
            "expression=happy|eye=open|mouth=open|motion=idle": "asset-cue-open",
          },
        },
        imageMapId: "character-zundamon",
      },
    ];

    const frame = new DefaultPreviewRenderFrameBuilder().build(request);

    expect(frame.characters[0]?.path).toBe("projects/project-1/assets/characters/zunda/cue-open.png");
  });

  it("emits explicit placeholders when background or character image is missing", () => {
    const request = createPreviewRequest(4);
    request.scene.backgroundAssetId = "missing-background";
    request.assets = [];
    request.characters = [
      {
        characterId: "character-zundamon",
        characterName: "Zundamon",
        imageMapId: null,
      },
    ];

    const frame = new DefaultPreviewRenderFrameBuilder().build(request);

    expect(frame.background?.assetId).toBe("preview-background-placeholder");
    expect(frame.background?.assetName).toBe("Missing background asset");
    expect(frame.background?.path).toBe("assets/placeholders/background-missing.png");
    expect(frame.characters[0]?.assetId).toBe("preview-character-placeholder:character-zundamon");
    expect(frame.characters[0]?.path).toBe("assets/placeholders/character-missing.png");
    expect(frame.textOverlays.some((overlay) => overlay.text.includes("Background asset missing-background was not found"))).toBe(true);
    expect(frame.textOverlays.some((overlay) => overlay.text.includes("Character placeholder: character-zundamon"))).toBe(true);
  });

  it("keeps Japanese talk text in preview overlays for engine-side font rendering", () => {
    const request = createPreviewRequest(1);
    request.scene.actions = [
      {
        actionId: "action-talk-japanese",
        actionType: "talk",
        startTime: 0,
        endTime: 2,
        targetId: "character-zundamon",
        payload: { text: "こんにちは、ずんだもんなのだ" },
      },
    ];

    const frame = new DefaultPreviewRenderFrameBuilder().build(request);

    expect(frame.textOverlays.some((overlay) => overlay.text.includes("こんにちは、ずんだもんなのだ"))).toBe(true);
    expect(JSON.stringify(frame.textOverlays)).not.toContain("????");
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
