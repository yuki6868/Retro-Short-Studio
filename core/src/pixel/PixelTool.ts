import type { PixelDocument } from "./PixelDocument";

export type PixelToolId = "brush" | "eraser" | "fill";

export interface PixelTool {
  readonly id: PixelToolId;
  readonly label: string;

  apply(input: { document: PixelDocument; x: number; y: number; color: string }): PixelDocument;
}

export class BrushTool implements PixelTool {
  readonly id = "brush";
  readonly label = "Brush";

  apply(input: { document: PixelDocument; x: number; y: number; color: string }): PixelDocument {
    return input.document.paintPixel(input.x, input.y, input.color);
  }
}

export class EraserTool implements PixelTool {
  readonly id = "eraser";
  readonly label = "Eraser";

  apply(input: { document: PixelDocument; x: number; y: number; color: string }): PixelDocument {
    return input.document.clearPixel(input.x, input.y);
  }
}

export class FillTool implements PixelTool {
  readonly id = "fill";
  readonly label = "Fill";

  apply(input: { document: PixelDocument; x: number; y: number; color: string }): PixelDocument {
    const snapshot = input.document.toSnapshot();
    const startIndex = input.y * snapshot.width + input.x;
    const targetColor = snapshot.pixels[startIndex];
    const fillColor = input.document.paintPixel(input.x, input.y, input.color).toSnapshot().pixels[startIndex];

    if (targetColor === fillColor) {
      return input.document;
    }

    const visited = new Set<number>();
    const stack: Array<{ x: number; y: number }> = [{ x: input.x, y: input.y }];
    let nextDocument = input.document;

    while (stack.length > 0) {
      const point = stack.pop();

      if (point === undefined) {
        continue;
      }

      if (point.x < 0 || point.y < 0 || point.x >= snapshot.width || point.y >= snapshot.height) {
        continue;
      }

      const index = point.y * snapshot.width + point.x;

      if (visited.has(index) || snapshot.pixels[index] !== targetColor) {
        continue;
      }

      visited.add(index);
      nextDocument = nextDocument.paintPixel(point.x, point.y, fillColor);

      stack.push({ x: point.x + 1, y: point.y });
      stack.push({ x: point.x - 1, y: point.y });
      stack.push({ x: point.x, y: point.y + 1 });
      stack.push({ x: point.x, y: point.y - 1 });
    }

    return nextDocument;
  }
}

export function createPixelTool(toolId: PixelToolId): PixelTool {
  if (toolId === "brush") {
    return new BrushTool();
  }

  if (toolId === "eraser") {
    return new EraserTool();
  }

  if (toolId === "fill") {
    return new FillTool();
  }

  throw new Error(`Unsupported pixel tool: ${toolId}`);
}