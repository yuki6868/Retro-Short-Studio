import { useMemo, useRef, useState, type ReactElement } from "react";

import { AssetLibraryUseCase, type AddAssetInput, type AssetLibraryState } from "../../../app/src";
import type { PreviewState } from "../../../app/src";
import { Project, type IdGenerator } from "../../../core/src";
import { AssetBrowser, PreviewPanel, StudioLayout, type StudioLayoutViewState } from "../index";
import "./studio-app.css";

export function StudioApp(): ReactElement {
  const [previewState, setPreviewState] = useState<PreviewState>(createInitialPreviewState);
  const assetLibraryRef = useRef<AssetLibraryUseCase | null>(null);

  if (assetLibraryRef.current === null) {
    assetLibraryRef.current = new AssetLibraryUseCase({
      project: Project.create({ projectId: "project-local-preview", projectName: "Local Preview" }),
      idGenerator: new BrowserAssetIdGenerator(),
    });
  }

  const assetLibrary = assetLibraryRef.current;
  const [assetState, setAssetState] = useState<AssetLibraryState>(assetLibrary.state);

  const previewUseCase = useMemo(
    () => ({
      get state() {
        return previewState;
      },
      async play(): Promise<PreviewState> {
        const next = { ...previewState, playbackStatus: "playing" as const, error: null };
        setPreviewState(next);
        return next;
      },
      pause(): PreviewState {
        const next = { ...previewState, playbackStatus: "paused" as const, error: null };
        setPreviewState(next);
        return next;
      },
      async seek(time: number): Promise<PreviewState> {
        const next = { ...previewState, currentTime: time, error: null };
        setPreviewState(next);
        return next;
      },
    }),
    [previewState],
  );

  const assetBrowserUseCase = useMemo(
    () => ({
      get state() {
        return assetState;
      },
      addAsset(input: AddAssetInput): AssetLibraryState {
        const next = assetLibrary.addAsset(input);
        setAssetState(next);
        return next;
      },
      selectAsset(assetId: string): AssetLibraryState {
        const next = assetLibrary.selectAsset(assetId);
        setAssetState(next);
        return next;
      },
    }),
    [assetLibrary, assetState],
  );

  const layout = new StudioLayout({
    preview: new PreviewPanel({ duration: 12, preview: previewUseCase }).render(),
    assetBrowser: new AssetBrowser({ assets: assetBrowserUseCase }).render(),
  }).render();

  return (
    <StudioWorkspace
      view={layout}
      onAddAsset={assetBrowserUseCase.addAsset}
      onPlay={previewUseCase.play}
      onPause={previewUseCase.pause}
      onSeek={previewUseCase.seek}
      onSelectAsset={assetBrowserUseCase.selectAsset}
    />
  );
}

type StudioWorkspaceProps = {
  view: StudioLayoutViewState;
  onAddAsset(input: AddAssetInput): AssetLibraryState;
  onPlay(): Promise<PreviewState>;
  onPause(): PreviewState;
  onSeek(time: number): Promise<PreviewState>;
  onSelectAsset(assetId: string): AssetLibraryState;
};

export function StudioWorkspace({ view, onAddAsset, onPlay, onPause, onSeek, onSelectAsset }: StudioWorkspaceProps): ReactElement {
  const [seekValue, setSeekValue] = useState(view.layout.center.preview.seekControl.value);
  const preview = view.layout.center.preview;
  const assetBrowser = view.layout.left[0].assetBrowser;

  return (
    <main className="rss-studio" aria-label={view.title}>
      <header className="rss-studio__header">
        <h1>{view.title}</h1>
      </header>

      <section className="rss-studio__body" aria-label="Studio regions">
        <aside className="rss-studio__left" aria-label="Left studio panels">
          <section className="rss-panel" aria-label={view.layout.left[0].title}>
            <h2>{view.layout.left[0].title}</h2>
            {assetBrowser === null ? (
              <p>{view.layout.left[0].placeholderText}</p>
            ) : (
              <div className="rss-asset-browser">
                <button
                  disabled={assetBrowser.addButton.disabled}
                  onClick={() =>
                    onAddAsset({
                      assetName: `Asset ${assetBrowser.assetCount + 1}`,
                      assetPath: `assets/asset-${assetBrowser.assetCount + 1}.png`,
                      assetType: "background",
                    })
                  }
                  type="button"
                >
                  {assetBrowser.addButton.label}
                </button>
                {assetBrowser.assets.length === 0 ? <p>{assetBrowser.emptyText}</p> : null}
                <ul aria-label="Asset list">
                  {assetBrowser.assets.map((asset) => (
                    <li key={asset.assetId}>
                      <button
                        aria-pressed={asset.selected}
                        onClick={() => onSelectAsset(asset.assetId)}
                        type="button"
                      >
                        {asset.assetName} / {asset.assetType}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="rss-panel" aria-label={view.layout.left[1].title}>
            <h2>{view.layout.left[1].title}</h2>
            <p>{view.layout.left[1].placeholderText}</p>
          </section>
        </aside>

        <section className="rss-preview" aria-label={view.layout.center.title}>
          <h2>{preview.title}</h2>
          <div className="rss-preview__surface" aria-label="Preview surface">
            {preview.surface.framePath === null ? preview.surface.placeholderText : preview.surface.framePath}
          </div>
          <div className="rss-preview__controls" aria-label="Preview controls">
            <button type="button" disabled={preview.playButton.disabled} onClick={() => void onPlay()}>
              {preview.playButton.label}
            </button>
            <button type="button" disabled={preview.pauseButton.disabled} onClick={() => onPause()}>
              {preview.pauseButton.label}
            </button>
            <label>
              {preview.seekControl.label}
              <input
                aria-label="Seek"
                disabled={preview.seekControl.disabled}
                max={preview.seekControl.max}
                min={preview.seekControl.min}
                onChange={(event) => {
                  const value = Number(event.currentTarget.value);
                  setSeekValue(value);
                  void onSeek(value);
                }}
                type="range"
                value={seekValue}
              />
            </label>
            <output>{preview.currentTime.toFixed(1)}s</output>
          </div>
        </section>

        <aside className="rss-studio__right" aria-label={view.layout.right.title}>
          <section className="rss-panel">
            <h2>{view.layout.right.title}</h2>
            <p>{view.layout.right.placeholderText}</p>
            <p>{view.layout.right.selectedTargetLabel}</p>
          </section>
        </aside>
      </section>

      <section className="rss-studio__bottom" aria-label={view.layout.bottom.title}>
        <h2>{view.layout.bottom.title}</h2>
        <p>{view.layout.bottom.placeholderText}</p>
      </section>
    </main>
  );
}

function createInitialPreviewState(): PreviewState {
  return {
    currentTime: 0,
    playbackStatus: "paused",
    framePath: null,
    width: 1280,
    height: 720,
    fps: 30,
    error: null,
  };
}

class BrowserAssetIdGenerator implements IdGenerator {
  generate(prefix: string): string {
    return `${prefix}-${crypto.randomUUID()}`;
  }
}
