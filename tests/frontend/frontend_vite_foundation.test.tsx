import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import type { PreviewState } from "../../app/src";
import { PreviewPanel, StudioLayout } from "../../frontend/src";
import { StudioWorkspace } from "../../frontend/src/react";

describe("Frontend Vite foundation", () => {
  it("renders the studio layout as a browser entry component without engine access", () => {
    const view = new StudioLayout({
      preview: new PreviewPanel({ duration: 12, preview: createPreviewUseCase() }).render(),
    }).render();

    const html = renderToStaticMarkup(
      <StudioWorkspace view={view} onPlay={async () => createPreviewState()} onPause={() => createPreviewState()} onSeek={async () => createPreviewState()} />,
    );

    expect(html).toContain("Retro Short Studio");
    expect(html).toContain("Asset Browser");
    expect(html).toContain("Scene Flow");
    expect(html).toContain("Preview");
    expect(html).toContain("Inspector");
    expect(html).toContain("Timeline");
    expect(html).toContain("Preview frame will appear here.");
    expect(html).not.toContain("PyxelRenderer");
    expect(html).not.toContain("VOICEVOX");
  });

  it("keeps preview controls visible in the browser shell", () => {
    const view = new StudioLayout({
      preview: new PreviewPanel({ duration: 20, preview: createPreviewUseCase() }).render(),
    }).render();

    const html = renderToStaticMarkup(
      <StudioWorkspace view={view} onPlay={async () => createPreviewState()} onPause={() => createPreviewState()} onSeek={async () => createPreviewState()} />,
    );

    expect(html).toContain("Play");
    expect(html).toContain("Pause");
    expect(html).toContain("Seek");
    expect(html).toContain("type=\"range\"");
    expect(html).toContain("0.0s");
  });
});

function createPreviewUseCase(state: PreviewState = createPreviewState()) {
  return {
    get state() {
      return state;
    },
    play: async () => state,
    pause: () => state,
    seek: async () => state,
  };
}

function createPreviewState(): PreviewState {
  return {
    currentTime: 0,
    playbackStatus: "paused",
    framePath: null,
    width: 1280,
    height: 720,
    fps: 30,
    error: null,
  };
}
