import { useMemo, useState, type ReactElement } from "react";

import type { PreviewState } from "../../../app/src";
import { PreviewPanel, StudioLayout, type StudioLayoutViewState } from "../index";
import "./studio-app.css";

export function StudioApp(): ReactElement {
  const [previewState, setPreviewState] = useState<PreviewState>(createInitialPreviewState);

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

  const layout = new StudioLayout({
    preview: new PreviewPanel({ duration: 12, preview: previewUseCase }).render(),
  }).render();

  return <StudioWorkspace view={layout} onPlay={previewUseCase.play} onPause={previewUseCase.pause} onSeek={previewUseCase.seek} />;
}

type StudioWorkspaceProps = {
  view: StudioLayoutViewState;
  onPlay(): Promise<PreviewState>;
  onPause(): PreviewState;
  onSeek(time: number): Promise<PreviewState>;
};

export function StudioWorkspace({ view, onPlay, onPause, onSeek }: StudioWorkspaceProps): ReactElement {
  const [seekValue, setSeekValue] = useState(view.layout.center.preview.seekControl.value);
  const preview = view.layout.center.preview;

  return (
    <main className="rss-studio" aria-label={view.title}>
      <header className="rss-studio__header">
        <h1>{view.title}</h1>
      </header>

      <section className="rss-studio__body" aria-label="Studio regions">
        <aside className="rss-studio__left" aria-label="Left studio panels">
          {view.layout.left.map((region) => (
            <section className="rss-panel" aria-label={region.title} key={region.id}>
              <h2>{region.title}</h2>
              <p>{region.placeholderText}</p>
            </section>
          ))}
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
