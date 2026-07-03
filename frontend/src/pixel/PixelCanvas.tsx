import type { ReactElement } from "react";

import type { PixelDocumentSnapshot } from "../../../core/src";

export type PixelCanvasProps = {
  document: PixelDocumentSnapshot;
  showGrid?: boolean;
  onPixelSelect?: (input: { x: number; y: number }) => void;
};

export function PixelCanvas({ document, showGrid = true, onPixelSelect }: PixelCanvasProps): ReactElement {
  const gridTemplate = `repeat(${document.width}, 1fr)`;

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
            onClick={() => onPixelSelect?.({ x, y })}
            role="gridcell"
            style={{ backgroundColor: pixel === "transparent" ? undefined : pixel }}
            type="button"
          />
        );
      })}
    </div>
  );
}
