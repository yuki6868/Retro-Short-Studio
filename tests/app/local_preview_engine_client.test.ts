import { describe, expect, it } from "vitest";

import { LocalPreviewEngineClient } from "../../app/src";
import type { PreviewRequest } from "../../shared";

describe("LocalPreviewEngineClient", () => {
  it("builds an actual preview frame data URL from scene, assets, and active actions", async () => {
    const client = new LocalPreviewEngineClient({ commandId: "cmd-local-preview-test" });

    const result = await client.preview(createPreviewRequest(1));

    expect(result.ok).toBe(true);
    expect(result.commandId).toBe("cmd-local-preview-test");
    expect(result.payload?.currentTime).toBe(1);
    expect(result.payload?.framePath).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
    expect(decodeURIComponent(result.payload?.framePath?.split(",")[1] ?? "")).toContain("Opening Background");
    expect(decodeURIComponent(result.payload?.framePath?.split(",")[1] ?? "")).toContain("Hello preview");
  });

  it("evaluates action timing so inactive actions are not shown in the preview frame", async () => {
    const client = new LocalPreviewEngineClient();

    const result = await client.preview(createPreviewRequest(4));
    const svg = decodeURIComponent(result.payload?.framePath?.split(",")[1] ?? "");

    expect(svg).toContain("Active actions: none");
    expect(svg).toContain("No active talk action");
  });

  it("keeps unsupported engine operations outside the local preview implementation", async () => {
    const client = new LocalPreviewEngineClient();

    const result = await client.generateVoice({ projectId: "project-1", talkActionId: "action-talk-1", speakerId: "1", text: "test", outputPath: "voices/test.wav" });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("LocalPreviewEngineClient does not support generateVoice.");
  });
});

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
          payload: { text: "Hello preview" },
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
