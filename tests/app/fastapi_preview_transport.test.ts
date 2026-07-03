import { afterEach, describe, expect, it, vi } from "vitest";

import { FastApiPreviewTransport, type PreviewRenderFramePayload } from "../../app/src";

describe("FastApiPreviewTransport", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends preview frames to the normal FastAPI backend instead of a separate engine server", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        commandId: "cmd-preview",
        ok: true,
        payload: { framePath: "data:image/png;base64,AAAA", currentTime: 1, width: 1280, height: 720 },
        error: null,
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const transport = new FastApiPreviewTransport();
    const frame = createFrame();
    const result = await transport.sendPreviewFrame("cmd-preview", frame);

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/preview/frame",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.stringify(init)).not.toContain("8765");
    expect(JSON.stringify(init)).not.toContain("serve-preview");
  });
});

function createFrame(): PreviewRenderFramePayload {
  return {
    currentTime: 1,
    width: 1280,
    height: 720,
    clearColor: 1,
    characters: [],
    textOverlays: [],
    effects: [],
    activeActionTypes: [],
  };
}
