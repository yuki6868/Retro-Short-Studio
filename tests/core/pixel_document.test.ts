import { describe, expect, it } from "vitest";

import { Palette, PixelDocument, createPixelTool } from "../../core/src";

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

  it("applies brush and eraser tools through the pixel tool framework", () => {
    const document = PixelDocument.create({ documentId: "pixel-1", projectId: "project-1", size: 16 });
    const brush = createPixelTool("brush");
    const eraser = createPixelTool("eraser");

    const painted = brush.apply({
      document,
      x: 2,
      y: 3,
      color: "#00e436",
    });

    const erased = eraser.apply({
      document: painted,
      x: 2,
      y: 3,
      color: "#00e436",
    });

    expect(painted.toSnapshot().pixels[3 * 16 + 2]).toBe("#00E436");
    expect(erased.toSnapshot().pixels[3 * 16 + 2]).toBe("transparent");
  });


  it("flood fills contiguous pixels with the selected color", () => {
    const document = Array.from({ length: 16 }, (_, y) => y).reduce(
      (current, y) => current.paintPixel(1, y, "#111111"),
      PixelDocument.create({ documentId: "pixel-1", projectId: "project-1", size: 16 }),
    );
    const fill = createPixelTool("fill");

    const filled = fill.apply({
      document,
      x: 0,
      y: 0,
      color: "#29adff",
    });

    const pixels = filled.toSnapshot().pixels;
    expect(pixels[0]).toBe("#29ADFF");
    expect(pixels[16]).toBe("#29ADFF");
    expect(pixels[2]).toBe("transparent");
    expect(pixels[1]).toBe("#111111");
    expect(pixels[15 * 16 + 1]).toBe("#111111");
  });

  it("does not repaint when flood fill target already has the selected color", () => {
    const document = PixelDocument.create({ documentId: "pixel-1", projectId: "project-1", size: 16 }).paintPixel(0, 0, "#29ADFF");
    const fill = createPixelTool("fill");

    const filled = fill.apply({
      document,
      x: 0,
      y: 0,
      color: "#29adff",
    });

    expect(filled.toSnapshot()).toEqual(document.toSnapshot());
  });

  it("selects colors from the palette", () => {
    const palette = Palette.createDefault();

    const selected = palette.selectColor("#29adff").toSnapshot();

    expect(selected.selectedColor).toBe("#29ADFF");
    expect(selected.colors).toContain("#29ADFF");
  });
});
