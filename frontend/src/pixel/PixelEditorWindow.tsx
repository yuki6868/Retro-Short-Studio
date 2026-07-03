import { useMemo, useState, type ReactElement } from "react";

import {
  Palette,
  PixelDocument,
  createPixelTool,
  type PaletteSnapshot,
  type PixelCanvasSize,
  type PixelDocumentSnapshot,
  type PixelToolId,
} from "../../../core/src";
import { PixelCanvas } from "./PixelCanvas";

export type PixelEditorWindowProps = {
  projectId: string;
  projectName: string;
  initialSize?: PixelCanvasSize;
};

export function PixelEditorWindow({ projectId, projectName, initialSize = 32 }: PixelEditorWindowProps): ReactElement {
  const initialDocument = useMemo(
    () => PixelDocument.create({ documentId: `pixel-${projectId}`, projectId, size: initialSize }).toSnapshot(),
    [initialSize, projectId],
  );

  const [document, setDocument] = useState<PixelDocumentSnapshot>(initialDocument);
  const [showGrid, setShowGrid] = useState(true);
  const [toolId, setToolId] = useState<PixelToolId>("brush");
  const [palette, setPalette] = useState<PaletteSnapshot>(() => Palette.createDefault().toSnapshot());

  const tool = useMemo(() => createPixelTool(toolId), [toolId]);

  const changeCanvasSize = (size: PixelCanvasSize): void => {
    setDocument((current) => PixelDocument.restore(current).resize(size).toSnapshot());
  };

  const selectColor = (color: string): void => {
    setPalette((current) => Palette.restore(current).selectColor(color).toSnapshot());
    setToolId("brush");
  };

  return (
    <main className="rss-pixel-editor-window" aria-label="Pixel Editor Window">
      <header className="rss-pixel-editor-window__header">
        <div>
          <h1>Pixel Character Editor</h1>
          <p>Project: {projectName}</p>
        </div>
        <p className="rss-pixel-editor-window__status">Project linked: {projectId}</p>
      </header>

      <section className="rss-pixel-editor-window__toolbar" aria-label="Pixel editor toolbar">
        <label>
          Canvas size
          <select
            aria-label="Pixel canvas size"
            onChange={(event) => changeCanvasSize(Number(event.currentTarget.value) as PixelCanvasSize)}
            value={document.width}
          >
            <option value={16}>16×16</option>
            <option value={32}>32×32</option>
            <option value={64}>64×64</option>
          </select>
        </label>

        <div className="rss-pixel-editor-window__tool-group" role="group" aria-label="Pixel tools">
          <button aria-pressed={toolId === "brush"} onClick={() => setToolId("brush")} type="button">
            Brush
          </button>
          <button aria-pressed={toolId === "eraser"} onClick={() => setToolId("eraser")} type="button">
            Eraser
          </button>
          <button aria-pressed={toolId === "fill"} onClick={() => setToolId("fill")} type="button">
            Fill
          </button>
        </div>

        <div className="rss-pixel-editor-window__palette" role="group" aria-label="Pixel palette">
          {palette.colors.map((color) => (
            <button
              aria-label={`Select ${color}`}
              aria-pressed={palette.selectedColor === color}
              className="rss-pixel-editor-window__palette-color"
              key={color}
              onClick={() => selectColor(color)}
              style={{ backgroundColor: color }}
              type="button"
            />
          ))}
        </div>

        <label>
          <input checked={showGrid} onChange={(event) => setShowGrid(event.currentTarget.checked)} type="checkbox" />
          Grid
        </label>
      </section>

      <section className="rss-pixel-editor-window__workspace" aria-label="Pixel editor workspace">
        <PixelCanvas
          document={document}
          onDocumentChange={setDocument}
          selectedColor={palette.selectedColor}
          showGrid={showGrid}
          tool={tool}
        />
      </section>
    </main>
  );
}