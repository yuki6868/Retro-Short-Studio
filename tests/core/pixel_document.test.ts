import { describe, expect, it } from "vitest";

import { PixelDocument } from "../../core/src";

describe("PixelDocument", () => {
  it("creates a project-linked square pixel document with a supported canvas size", () => {
    const document = PixelDocument.create({ documentId: "pixel-1", projectId: "project-1", size: 32 });

    expect(document.toSnapshot()).toEqual({
      documentId: "pixel-1",
      projectId: "project-1",
      width: 32,
      height: 32,
      pixels: Array(32 * 32).fill("transparent"),
    });
  });

  it("paints and clears pixels without mutating the previous snapshot", () => {
    const document = PixelDocument.create({ documentId: "pixel-1", projectId: "project-1", size: 16 });
    const painted = document.paintPixel(1, 2, "#ff00aa");
    const cleared = painted.clearPixel(1, 2);

    expect(document.toSnapshot().pixels[2 * 16 + 1]).toBe("transparent");
    expect(painted.toSnapshot().pixels[2 * 16 + 1]).toBe("#FF00AA");
    expect(cleared.toSnapshot().pixels[2 * 16 + 1]).toBe("transparent");
  });

  it("preserves existing pixels when resizing within the supported editor sizes", () => {
    const document = PixelDocument.create({ documentId: "pixel-1", projectId: "project-1", size: 16 }).paintPixel(15, 15, "#112233");

    const resized = document.resize(32).toSnapshot();

    expect(resized.width).toBe(32);
    expect(resized.height).toBe(32);
    expect(resized.pixels[15 * 32 + 15]).toBe("#112233");
  });

  it("rejects unsupported canvas sizes and invalid colors", () => {
    expect(() => PixelDocument.create({ documentId: "pixel-1", projectId: "project-1", size: 24 as 16 })).toThrow(
      "PixelDocument canvas size must be 16, 32, or 64.",
    );
    expect(() => PixelDocument.create({ documentId: "pixel-1", projectId: "project-1", size: 16 }).paintPixel(0, 0, "red")).toThrow(
      "PixelDocument pixel color must be transparent or a #RRGGBB value.",
    );
  });
});
