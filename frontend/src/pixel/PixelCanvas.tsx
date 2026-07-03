import type { ReactElement } from "react";

import { PixelDocument, type PixelDocumentSnapshot, type PixelTool } from "../../../core/src";

export type PixelCanvasProps = {
  document: PixelDocumentSnapshot;
  showGrid?: boolean;
  selectedColor: string;
  tool: PixelTool;
  onDocumentChange: (document: PixelDocumentSnapshot) => void;
};

export function PixelCanvas({
  document,
  showGrid = true,
  selectedColor,
  tool,
  onDocumentChange,
}: PixelCanvasProps): ReactElement {
  const gridTemplate = `repeat(${document.width}, 1fr)`;

  const applyTool = (x: number, y: number): void => {
    const nextDocument = tool.apply({
      document: PixelDocument.restore(document),
      x,
      y,
      color: selectedColor,
    });

    onDocumentChange(nextDocument.toSnapshot());
  };

  return (
    <div
      aria-label={`${document.width} by ${document.height} pixel canvas`}
      className={`rss-pixel-canvas${showGrid ? " rss-pixel-canvas--grid" : ""}`}
      role="grid"
      style={{ gridTemplateColumns: gridTemplate }}
    >
      {document.pixels.map((pixel, index) => {
        const x = index % document.width;
        const y = Math.floor(index / document.width);

        return (
          <button
            aria-label={`Pixel ${x}, ${y}`}
            className="rss-pixel-canvas__pixel"
            key={`${x}-${y}`}
            onClick={() => applyTool(x, y)}
            role="gridcell"
            style={{ backgroundColor: pixel === "transparent" ? undefined : pixel }}
            type="button"
          />
        );
      })}
    </div>
  );
}