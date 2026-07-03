import { useMemo, useState, type ReactElement } from "react";

import { PixelDocument, type PixelCanvasSize, type PixelDocumentSnapshot } from "../../../core/src";
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

  const changeCanvasSize = (size: PixelCanvasSize): void => {
    setDocument((current) => PixelDocument.restore(current).resize(size).toSnapshot());
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
        <label>
          <input checked={showGrid} onChange={(event) => setShowGrid(event.currentTarget.checked)} type="checkbox" />
          Grid
        </label>
      </section>

      <section className="rss-pixel-editor-window__workspace" aria-label="Pixel editor workspace">
        <PixelCanvas document={document} showGrid={showGrid} />
      </section>
    </main>
  );
}
