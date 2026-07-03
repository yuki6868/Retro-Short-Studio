import { useMemo, useState, type ReactElement } from "react";

import {
  Palette,
  PixelCommand,
  PixelDocument,
  PixelHistory,
  createPixelTool,
  type PaletteSnapshot,
  type PixelCanvasSize,
  type PixelDocumentSnapshot,
  type CharacterImageMapStateKind,
  type PixelToolId,
} from "../../../core/src";
import { PixelCanvas } from "./PixelCanvas";

export type PixelEditorCharacterAssignment = {
  characterId: string;
  kind: CharacterImageMapStateKind;
  state: string;
};

export type PixelEditorSaveInput = {
  document: PixelDocumentSnapshot;
  assetName: string;
  assignToCharacterImageMap?: PixelEditorCharacterAssignment;
};

export type PixelEditorSaveResult = {
  assetName: string;
  assetPath: string;
  assignedCharacterImageMap?: PixelEditorCharacterAssignment;
};

export type PixelEditorWindowProps = {
  projectId: string;
  projectName: string;
  initialSize?: PixelCanvasSize;
  onSaveDocument?: (input: PixelEditorSaveInput) => Promise<PixelEditorSaveResult>;
  characterAssignment?: PixelEditorCharacterAssignment;
};

export function PixelEditorWindow({ projectId, projectName, initialSize = 32, onSaveDocument, characterAssignment }: PixelEditorWindowProps): ReactElement {
  const initialDocument = useMemo(
    () => PixelDocument.create({ documentId: `pixel-${projectId}`, projectId, size: initialSize }).toSnapshot(),
    [initialSize, projectId],
  );

  const [document, setDocument] = useState<PixelDocumentSnapshot>(initialDocument);
  const [history, setHistory] = useState(() => PixelHistory.empty());
  const [showGrid, setShowGrid] = useState(true);
  const [toolId, setToolId] = useState<PixelToolId>("brush");
  const [palette, setPalette] = useState<PaletteSnapshot>(() => Palette.createDefault().toSnapshot());
  const [assetName, setAssetName] = useState(`pixel-${projectId}`);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const tool = useMemo(() => createPixelTool(toolId), [toolId]);

  const changeCanvasSize = (size: PixelCanvasSize): void => {
    const nextDocument = PixelDocument.restore(document).resize(size).toSnapshot();
    commitDocument(nextDocument, `Resize canvas to ${size}×${size}`);
  };

  const commitDocument = (nextDocument: PixelDocumentSnapshot, label: string): void => {
    if (arePixelDocumentsEqual(document, nextDocument)) {
      return;
    }

    const command = PixelCommand.create({
      label,
      before: document,
      after: nextDocument,
    });

    setHistory((current) => current.commit(command));
    setDocument(nextDocument);
  };

  const undo = (): void => {
    const change = history.undo();

    if (change === null) {
      return;
    }

    setHistory(change.history);
    setDocument(change.document);
  };

  const redo = (): void => {
    const change = history.redo();

    if (change === null) {
      return;
    }

    setHistory(change.history);
    setDocument(change.document);
  };

  const selectColor = (color: string): void => {
    setPalette((current) => Palette.restore(current).selectColor(color).toSnapshot());
    setToolId("brush");
  };

  const saveToProject = async (): Promise<void> => {
    if (onSaveDocument === undefined) {
      setSaveStatus("Project save is not connected.");
      return;
    }

    setSaveStatus("Saving pixel asset...");

    try {
      const result = await onSaveDocument({
        document,
        assetName,
        ...(characterAssignment === undefined ? {} : { assignToCharacterImageMap: characterAssignment }),
      });
      const assignmentStatus = result.assignedCharacterImageMap === undefined
        ? ""
        : ` and assigned to ${result.assignedCharacterImageMap.kind}:${result.assignedCharacterImageMap.state}`;
      setSaveStatus(`Saved pixel asset: ${result.assetName} -> ${result.assetPath}${assignmentStatus}`);
    } catch (error) {
      setSaveStatus(error instanceof Error ? error.message : "Pixel asset save failed.");
    }
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

      <section className="rss-pixel-editor-window__save" aria-label="Pixel asset save">
        {characterAssignment === undefined ? null : (
          <p className="rss-pixel-editor-window__assignment">
            Character target: {characterAssignment.characterId} / {characterAssignment.kind}:{characterAssignment.state}
          </p>
        )}
        <label>
          Asset name
          <input
            aria-label="Pixel asset name"
            onChange={(event) => setAssetName(event.currentTarget.value)}
            type="text"
            value={assetName}
          />
        </label>
        <button disabled={onSaveDocument === undefined} onClick={() => void saveToProject()} type="button">
          Save To Project Assets
        </button>
        {saveStatus === null ? null : <p role="status">{saveStatus}</p>}
      </section>

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

        <div className="rss-pixel-editor-window__history" role="group" aria-label="Pixel history">
          <button disabled={!history.canUndo()} onClick={undo} type="button">
            Undo
          </button>
          <button disabled={!history.canRedo()} onClick={redo} type="button">
            Redo
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
          onDocumentChange={(nextDocument) => commitDocument(nextDocument, `${tool.label} pixel edit`)}
          selectedColor={palette.selectedColor}
          showGrid={showGrid}
          tool={tool}
        />
      </section>
    </main>
  );
}

function arePixelDocumentsEqual(left: PixelDocumentSnapshot, right: PixelDocumentSnapshot): boolean {
  if (left.documentId !== right.documentId || left.projectId !== right.projectId || left.width !== right.width || left.height !== right.height) {
    return false;
  }

  return left.pixels.length === right.pixels.length && left.pixels.every((pixel, index) => pixel === right.pixels[index]);
}
