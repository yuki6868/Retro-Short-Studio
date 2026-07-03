import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { EditorLauncher, PixelEditorWindow } from "../../frontend/src";

describe("Pixel Editor Window", () => {
  it("renders an independent project-linked editor surface", () => {
    const html = renderToStaticMarkup(
      <PixelEditorWindow projectId="project-1" projectName="Accounting Short" initialSize={16} />,
    );

    expect(html).toContain('aria-label="Pixel Editor Window"');
    expect(html).toContain("Pixel Character Editor");
    expect(html).toContain("Project: Accounting Short");
    expect(html).toContain("Project linked: project-1");
    expect(html).toContain('aria-label="16 by 16 pixel canvas"');
    expect(html).toContain('aria-label="Pixel canvas size"');
  });

  it("builds a dedicated browser window URL without coupling Studio to the editor UI", () => {
    const opened: Array<{ url: string; target: string; features: string }> = [];
    const launcher = new EditorLauncher({
      open: (url?: string | URL, target?: string, features?: string) => {
        opened.push({ url: String(url), target: target ?? "", features: features ?? "" });
        return { focus: () => undefined } as Window;
      },
    });

    const result = launcher.openPixelEditor({ projectId: "project-1", projectName: "Accounting Short" });

    expect(result.opened).toBe(true);
    expect(result.target).toBe("retro-short-studio-pixel-editor");
    expect(result.url).toContain("#pixel-editor?");
    expect(result.url).toContain("projectId=project-1");
    expect(result.url).toContain("projectName=Accounting+Short");
    expect(opened[0].target).toBe("retro-short-studio-pixel-editor");
    expect(opened[0].features).toContain("width=980");
  });
});
