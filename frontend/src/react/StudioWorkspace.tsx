import { useEffect, useState, type PointerEvent, type ReactElement } from "react";

import type {
  AssetLibraryState,
  CreateActionKind,
  InspectorState,
  MoveSceneInput,
  MoveTimelineItemInput,
  PreviewState,
  ResizeTimelineItemEndInput,
  ResizeTimelineItemStartInput,
  SceneFlowState,
  TimelineState,
  AddAssetInput,
  AddSceneInput,
} from "../../../app/src";
import { TimelineInteractionMapper, type StudioLayoutViewState, type TimelineItemViewState } from "../index";

export type StudioWorkspaceProps = {
  view: StudioLayoutViewState;
  onAddAsset(input: AddAssetInput): AssetLibraryState;
  onAddScene(input: AddSceneInput): SceneFlowState;
  onDeleteScene(sceneId: string): SceneFlowState;
  onMoveScene(input: MoveSceneInput): SceneFlowState;
  onPlay(): Promise<PreviewState>;
  onPause(): PreviewState;
  onSeek(time: number): Promise<PreviewState>;
  onSelectAsset(assetId: string): AssetLibraryState;
  onSelectScene(sceneId: string): SceneFlowState;
  onEditSceneName(sceneId: string, sceneName: string): InspectorState;
  onEditSceneDuration(sceneId: string, duration: number): InspectorState;
  onEditSceneBackground?: (sceneId: string, backgroundAssetId: string | null) => InspectorState;
  onEditActionTarget?: (sceneId: string, actionId: string, targetId: string | null) => InspectorState;
  onEditActionPayload?: (sceneId: string, actionId: string, payload: Record<string, string | number | boolean | null>) => InspectorState;
  onGenerateActionVoice?: (sceneId: string, actionId: string) => Promise<InspectorState>;
  onPlayActionVoice?: (voiceAssetPath: string) => Promise<void>;
  onStopActionVoice?: () => void;
  voiceStatus?: string | null;
  onSetTimelinePlayhead?: (time: number) => TimelineState;
  onSetTimelineScale?: (timeScale: number) => TimelineState;
  onMoveTimelineItem?: (input: MoveTimelineItemInput) => TimelineState;
  onResizeTimelineItemStart?: (input: ResizeTimelineItemStartInput) => TimelineState;
  onResizeTimelineItemEnd?: (input: ResizeTimelineItemEndInput) => TimelineState;
  onCreateAction?: (kind: CreateActionKind) => TimelineState;
  onDeleteAction?: (sceneId: string, actionId: string) => TimelineState;
  onSelectAction?: (sceneId: string, actionId: string) => InspectorState;
};

export function StudioWorkspace({
  view,
  onAddAsset,
  onAddScene,
  onDeleteScene,
  onMoveScene,
  onPlay,
  onPause,
  onSeek,
  onSelectAsset,
  onSelectScene,
  onEditSceneName,
  onEditSceneDuration,
  onEditSceneBackground,
  onEditActionTarget,
  onEditActionPayload,
  onGenerateActionVoice,
  onPlayActionVoice,
  onStopActionVoice,
  voiceStatus,
  onSetTimelinePlayhead,
  onSetTimelineScale,
  onMoveTimelineItem,
  onResizeTimelineItemStart,
  onResizeTimelineItemEnd,
  onCreateAction,
  onDeleteAction,
  onSelectAction,
}: StudioWorkspaceProps): ReactElement {
  const [seekValue, setSeekValue] = useState(view.layout.center.preview.seekControl.value);
  const [isSeekEditing, setIsSeekEditing] = useState(false);
  const preview = view.layout.center.preview;

  useEffect(() => {
    if (!isSeekEditing) {
      setSeekValue(preview.seekControl.value);
    }
  }, [isSeekEditing, preview.seekControl.value]);

  const commitSeek = (): void => {
    if (!Number.isFinite(seekValue)) {
      return;
    }

    void onSeek(seekValue);
  };

  const assetBrowser = view.layout.left[0].assetBrowser;
  const sceneFlow = view.layout.left[1].sceneFlow;
  const inspectorPanel = view.layout.right.inspector;
  const sceneInspector = inspectorPanel?.type === "scene" ? inspectorPanel : null;
  const characterInspector = inspectorPanel?.type === "character" ? inspectorPanel : null;
  const actionInspector = inspectorPanel?.type === "action" ? inspectorPanel : null;
  const timelineView = view.layout.bottom.timeline;
  const [timelineInteraction, setTimelineInteraction] = useState<TimelinePointerInteraction | null>(null);

  const startTimelineInteraction = (
    mode: TimelinePointerInteraction["mode"],
    item: TimelineItemViewState,
    event: PointerEvent<HTMLElement>,
  ): void => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    onSelectAction?.(item.sceneId, item.actionId);
    setTimelineInteraction({
      item,
      mode,
      pointerId: event.pointerId,
      startClientX: event.clientX,
    });
  };

  const finishTimelineInteraction = (event: PointerEvent<HTMLElement>): void => {
    if (timelineInteraction === null || timelineInteraction.pointerId !== event.pointerId || timelineView === null) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const deltaPixels = event.clientX - timelineInteraction.startClientX;
    const mapper = new TimelineInteractionMapper({ timeScale: timelineView.timeScale });

    if (timelineInteraction.mode === "move") {
      onMoveTimelineItem?.(mapper.createMoveInput(timelineInteraction.item, deltaPixels));
    }

    if (timelineInteraction.mode === "resize-start") {
      onResizeTimelineItemStart?.(mapper.createResizeStartInput(timelineInteraction.item, deltaPixels));
    }

    if (timelineInteraction.mode === "resize-end") {
      onResizeTimelineItemEnd?.(mapper.createResizeEndInput(timelineInteraction.item, deltaPixels));
    }

    setTimelineInteraction(null);
  };

  const cancelTimelineInteraction = (event: PointerEvent<HTMLElement>): void => {
    if (timelineInteraction !== null && timelineInteraction.pointerId === event.pointerId) {
      setTimelineInteraction(null);
    }
  };

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
            {sceneFlow === null ? (
              <p>{view.layout.left[1].placeholderText}</p>
            ) : (
              <div className="rss-scene-flow">
                <button
                  disabled={sceneFlow.addButton.disabled}
                  onClick={() =>
                    onAddScene({
                      sceneName: `Scene ${sceneFlow.sceneCount + 1}`,
                      duration: 6,
                    })
                  }
                  type="button"
                >
                  {sceneFlow.addButton.label}
                </button>
                {sceneFlow.scenes.length === 0 ? <p>{sceneFlow.emptyText}</p> : null}
                <ol aria-label="Scene list">
                  {sceneFlow.scenes.map((scene, index) => (
                    <li key={scene.sceneId}>
                      <button
                        aria-pressed={scene.selected}
                        onClick={() => onSelectScene(scene.sceneId)}
                        type="button"
                      >
                        {scene.orderLabel}. {scene.sceneName} / {scene.duration.toFixed(1)}s
                      </button>
                      <button
                        disabled={index === 0}
                        onClick={() => onMoveScene({ sceneId: scene.sceneId, toIndex: index - 1 })}
                        type="button"
                      >
                        Up
                      </button>
                      <button
                        disabled={index === sceneFlow.scenes.length - 1}
                        onClick={() => onMoveScene({ sceneId: scene.sceneId, toIndex: index + 1 })}
                        type="button"
                      >
                        Down
                      </button>
                      <button onClick={() => onDeleteScene(scene.sceneId)} type="button">
                        Delete
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </section>
        </aside>

        <section className="rss-preview" aria-label={view.layout.center.title}>
          <h2>{preview.title}</h2>
          <div className="rss-preview__surface" aria-label="Preview surface">
            {preview.surface.framePath === null ? (
              preview.surface.placeholderText
            ) : (
              <img alt="Current preview frame" src={preview.surface.framePath} />
            )}
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
                onBlur={() => {
                  setIsSeekEditing(false);
                  commitSeek();
                }}
                onChange={(event) => {
                  setSeekValue(Number(event.currentTarget.value));
                }}
                onKeyUp={(event) => {
                  if (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "Home" || event.key === "End") {
                    commitSeek();
                  }
                }}
                onPointerDown={() => setIsSeekEditing(true)}
                onPointerUp={() => {
                  setIsSeekEditing(false);
                  commitSeek();
                }}
                step={1 / 30}
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
            {inspectorPanel === null || inspectorPanel.type === "empty" ? (
              <>
                <p>{view.layout.right.placeholderText}</p>
                <p>{view.layout.right.selectedTargetLabel}</p>
              </>
            ) : null}
            {sceneInspector !== null ? (
              <div className="rss-inspector" aria-label="Scene Inspector">
                <p>{sceneInspector.selectedTargetLabel}</p>
                <label>
                  Scene name
                  <input
                    aria-label="Scene name"
                    defaultValue={sceneInspector.sceneName}
                    onBlur={(event) => onEditSceneName(sceneInspector.sceneId, event.currentTarget.value)}
                  />
                </label>
                <label>
                  Duration
                  <input
                    aria-label="Scene duration"
                    defaultValue={sceneInspector.duration}
                    min={0.1}
                    onBlur={(event) =>
                      onEditSceneDuration(sceneInspector.sceneId, Number(event.currentTarget.value))
                    }
                    step={0.1}
                    type="number"
                  />
                </label>
                <label>
                  Background
                  <select
                    aria-label="Scene background"
                    value={sceneInspector.backgroundAssetId ?? ""}
                    onChange={(event) =>
                      onEditSceneBackground?.(
                        sceneInspector.sceneId,
                        event.currentTarget.value.length === 0 ? null : event.currentTarget.value,
                      )
                    }
                  >
                    <option value="">No background</option>
                    {sceneInspector.backgroundOptions.map((asset) => (
                      <option key={asset.assetId} value={asset.assetId}>
                        {asset.assetName}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}
            {characterInspector !== null ? (
              <div className="rss-inspector" aria-label="Character Inspector">
                <p>{characterInspector.selectedTargetLabel}</p>
                <p>{characterInspector.characterName}</p>
              </div>
            ) : null}
            {actionInspector !== null ? (
              <div className="rss-inspector" aria-label="Action Inspector">
                <p>{actionInspector.selectedTargetLabel}</p>
                <p>{actionInspector.actionType}</p>
                {actionInspector.actionType === "talk" ? (
                  <div className="rss-inspector__voice" aria-label="Talk voice preview">
                    <button
                      disabled={onGenerateActionVoice === undefined}
                      onClick={() => void onGenerateActionVoice?.(actionInspector.sceneId, actionInspector.actionId)}
                      type="button"
                    >
                      Generate Voice
                    </button>
                    <button
                      disabled={actionInspector.voice?.canPlay !== true || onPlayActionVoice === undefined}
                      onClick={() => {
                        const path = actionInspector.voice?.voiceAssetPath;
                        if (path !== undefined && path !== null) {
                          void onPlayActionVoice?.(path);
                        }
                      }}
                      type="button"
                    >
                      Play Voice
                    </button>
                    <button
                      disabled={actionInspector.voice?.canPlay !== true || onStopActionVoice === undefined}
                      onClick={() => onStopActionVoice?.()}
                      type="button"
                    >
                      Stop Voice
                    </button>
                    <p>voiceAssetPath: {actionInspector.voice?.voiceAssetPath ?? "Not generated"}</p>
                    <p>duration: {formatVoiceDuration(actionInspector.voice?.duration ?? null)}</p>
                  </div>
                ) : null}
                {voiceStatus !== null ? <p role="status">{voiceStatus}</p> : null}
                <label>
                  Target
                  <input
                    aria-label="Action target"
                    defaultValue={actionInspector.targetId ?? ""}
                    onBlur={(event) =>
                      onEditActionTarget?.(
                        actionInspector.sceneId,
                        actionInspector.actionId,
                        event.currentTarget.value.trim().length === 0 ? null : event.currentTarget.value,
                      )
                    }
                  />
                </label>
                <label>
                  Payload JSON
                  <textarea
                    aria-label="Action payload"
                    defaultValue={actionInspector.payloadPreview}
                    onBlur={(event) => {
                      const parsed = JSON.parse(event.currentTarget.value) as Record<string, string | number | boolean | null>;
                      onEditActionPayload?.(actionInspector.sceneId, actionInspector.actionId, parsed);
                    }}
                  />
                </label>
                <button
                  onClick={() => onDeleteAction?.(actionInspector.sceneId, actionInspector.actionId)}
                  type="button"
                >
                  Delete Action
                </button>
              </div>
            ) : null}
          </section>
        </aside>
      </section>

      <section className="rss-studio__bottom" aria-label={view.layout.bottom.title}>
        <h2>{view.layout.bottom.title}</h2>
        {timelineView === null ? (
          <p>{view.layout.bottom.placeholderText}</p>
        ) : (
          <div className="rss-timeline">
            <p>{timelineView.sceneName === null ? timelineView.emptyText : `Scene: ${timelineView.sceneName}`}</p>
            <label>
              Playhead
              <input
                aria-label="Timeline playhead"
                max={timelineView.duration}
                min={0}
                onChange={(event) => onSetTimelinePlayhead?.(Number(event.currentTarget.value))}
                step={0.1}
                type="range"
                value={timelineView.playhead}
              />
            </label>
            <label>
              Time scale
              <input
                aria-label="Timeline time scale"
                min={10}
                onChange={(event) => onSetTimelineScale?.(Number(event.currentTarget.value))}
                step={10}
                type="number"
                value={timelineView.timeScale}
              />
            </label>
            <div className="rss-timeline__actions" aria-label="Action creation">
              <button disabled={timelineView.sceneId === null} onClick={() => onCreateAction?.("talk")} type="button">
                Add Talk
              </button>
              <button disabled={timelineView.sceneId === null} onClick={() => onCreateAction?.("character")} type="button">
                Add Character
              </button>
              <button disabled={timelineView.sceneId === null} onClick={() => onCreateAction?.("effect")} type="button">
                Add Effect
              </button>
              <button disabled={timelineView.sceneId === null} onClick={() => onCreateAction?.("camera")} type="button">
                Add Camera
              </button>
            </div>
            <div aria-label="Timeline tracks">
              {timelineView.tracks.map((track) => (
                <section className="rss-timeline__track" key={track.trackId} aria-label={`${track.label} track`}>
                  <h3>{track.label}</h3>
                  <p>{track.purpose}</p>
                  {track.items.length === 0 ? <p>{track.emptyText}</p> : null}
                  <div className="rss-timeline__lane" role="list">
                    {track.items.map((item) => (
                      <div
                        aria-label={item.label}
                        className="rss-timeline__item"
                        key={item.itemId}
                        onPointerCancel={cancelTimelineInteraction}
                        onPointerDown={(event) => startTimelineInteraction("move", item, event)}
                        onPointerUp={finishTimelineInteraction}
                        role="listitem"
                        style={{ marginLeft: item.left, width: item.width }}
                      >
                        <button
                          aria-label={`Resize start ${item.label}`}
                          className="rss-timeline__resize-handle rss-timeline__resize-handle--start"
                          onPointerCancel={cancelTimelineInteraction}
                          onPointerDown={(event) => startTimelineInteraction("resize-start", item, event)}
                          onPointerUp={finishTimelineInteraction}
                          type="button"
                        >
                          Start
                        </button>
                        <button
                          aria-label={`Move ${item.label}`}
                          className="rss-timeline__item-body"
                          onClick={() => onSelectAction?.(item.sceneId, item.actionId)}
                          type="button"
                        >
                          <span>{item.label}</span>
                          <span>{item.summary}</span>
                        </button>
                        <button
                          aria-label={`Resize end ${item.label}`}
                          className="rss-timeline__resize-handle rss-timeline__resize-handle--end"
                          onPointerCancel={cancelTimelineInteraction}
                          onPointerDown={(event) => startTimelineInteraction("resize-end", item, event)}
                          onPointerUp={finishTimelineInteraction}
                          type="button"
                        >
                          End
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

type TimelinePointerInteraction = {
  mode: "move" | "resize-start" | "resize-end";
  item: TimelineItemViewState;
  pointerId: number;
  startClientX: number;
};


function formatVoiceDuration(duration: number | null): string {
  return duration === null ? "Unknown" : `${duration.toFixed(2)}s`;
}
