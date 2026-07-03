import type { PixelDocument } from "./PixelDocument";

export type PixelToolId = "brush" | "eraser";

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

export function createPixelTool(toolId: PixelToolId): PixelTool {
  if (toolId === "brush") {
    return new BrushTool();
  }

  if (toolId === "eraser") {
    return new EraserTool();
  }

  throw new Error(`Unsupported pixel tool: ${toolId}`);
}