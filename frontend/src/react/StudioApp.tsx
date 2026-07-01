import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type ReactElement } from "react";

import {
  ActionEditorUseCase,
  GenerateVoiceUseCase,
  AssetLibraryUseCase,
  PyxelPreviewEngineClient,
  PreviewSceneUseCase,
  InspectorUseCase,
  SceneFlowUseCase,
  TimelineUseCase,
  type AddAssetInput,
  type AddSceneInput,
  type ChangeActionPayloadInput,
  type ChangeActionTargetInput,
  type ChangeSceneBackgroundInput,
  type AssetLibraryState,
  type CreateActionKind,
  type MoveSceneInput,
  type SceneFlowState,
  type InspectorState,
  type TimelineState,
  type RenameSceneInput,
  type ChangeSceneDurationInput,
  type RenameCharacterInput,
  type ChangeActionTimeRangeInput,
  type MoveTimelineItemInput,
  type ResizeTimelineItemEndInput,
  type ResizeTimelineItemStartInput,
} from "../../../app/src";
import type { PreviewState } from "../../../app/src";
import type { AssetDto, CharacterDto, SceneDto } from "../../../shared";
import { Action, Asset, Project, Scene, type IdGenerator } from "../../../core/src";
import {
  AssetBrowser,
  Inspector,
  PreviewPanel,
  SceneFlow,
  StudioLayout,
  Timeline,
  TimelineInteractionMapper,
  HtmlVoicePreviewPlayer,
  type StudioLayoutViewState,
  type TimelineItemViewState,
} from "../index";
import { loadBrowserProject, saveBrowserProject } from "./BrowserProjectPersistence";
import "./studio-app.css";

export function StudioApp(): ReactElement {
  const [previewState, setPreviewState] = useState<PreviewState>(createInitialPreviewState);
  const latestPreviewStateRef = useRef<PreviewState>(previewState);
  const previewRequestSeqRef = useRef(0);
  const playbackSessionRef = useRef(0);
  const projectRef = useRef<Project | null>(null);
  const assetLibraryRef = useRef<AssetLibraryUseCase | null>(null);
  const sceneFlowRef = useRef<SceneFlowUseCase | null>(null);
  const inspectorRef = useRef<InspectorUseCase | null>(null);
  const timelineRef = useRef<TimelineUseCase | null>(null);
  const actionEditorRef = useRef<ActionEditorUseCase | null>(null);
  const generateVoiceRef = useRef<GenerateVoiceUseCase | null>(null);
  const voicePreviewPlayerRef = useRef<HtmlVoicePreviewPlayer | null>(null);
  const bootstrappedRef = useRef(false);

  if (projectRef.current === null) {
    projectRef.current = createInitialProject();
  }

  if (assetLibraryRef.current === null) {
    assetLibraryRef.current = new AssetLibraryUseCase({
      project: projectRef.current,
      idGenerator: new BrowserAssetIdGenerator(),
    });
  }

  if (sceneFlowRef.current === null) {
    sceneFlowRef.current = new SceneFlowUseCase({
      project: projectRef.current,
      idGenerator: new BrowserSceneIdGenerator(),
    });
  }

  if (inspectorRef.current === null) {
    inspectorRef.current = new InspectorUseCase({
      project: projectRef.current,
    });
  }

  if (timelineRef.current === null) {
    timelineRef.current = new TimelineUseCase({
      project: projectRef.current,
    });
  }

  if (actionEditorRef.current === null) {
    actionEditorRef.current = new ActionEditorUseCase({
      project: projectRef.current,
      idGenerator: new BrowserActionIdGenerator(),
    });
  }

  if (generateVoiceRef.current === null) {
    generateVoiceRef.current = new GenerateVoiceUseCase({
      project: projectRef.current,
      engineClient: new PyxelPreviewEngineClient(),
      idGenerator: new BrowserVoiceIdGenerator(),
      defaultSpeakerId: "3",
      defaultOutputDirectory: "projects/voices",
    });
  }

  if (voicePreviewPlayerRef.current === null) {
    voicePreviewPlayerRef.current = new HtmlVoicePreviewPlayer();
  }

  const assetLibrary = assetLibraryRef.current;
  const sceneFlow = sceneFlowRef.current;
  const inspector = inspectorRef.current;
  const timeline = timelineRef.current;
  const actionEditor = actionEditorRef.current;
  const generateVoice = generateVoiceRef.current;
  const voicePreviewPlayer = voicePreviewPlayerRef.current;

  const persistCurrentProject = (): void => {
    saveBrowserProject(requireProject(projectRef.current));
  };

  if (!bootstrappedRef.current) {
    const initialSceneId = projectRef.current.toSnapshot().scenes[0]?.sceneId ?? null;

    if (initialSceneId !== null) {
      sceneFlow.selectScene(initialSceneId);
      inspector.selectScene(initialSceneId);
      timeline.showScene(initialSceneId);
    }

    bootstrappedRef.current = true;
  }

  const [assetState, setAssetState] = useState<AssetLibraryState>(assetLibrary.state);
  const [sceneState, setSceneState] = useState<SceneFlowState>(sceneFlow.state);
  const [inspectorState, setInspectorState] = useState<InspectorState>(inspector.state);
  const [timelineState, setTimelineState] = useState<TimelineState>(timeline.state);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);

  const selectedSceneForPreview = findSelectedSceneDto(requireProject(projectRef.current), sceneFlow.state.selectedSceneId);
  const selectedSceneDuration = selectedSceneForPreview?.duration ?? 0;

  const applyPreviewState = useCallback((next: PreviewState): PreviewState => {
    latestPreviewStateRef.current = next;
    setPreviewState(next);
    return next;
  }, []);

  const renderPreviewAt = useCallback(
    async (time: number, playbackStatus: PreviewState["playbackStatus"]): Promise<PreviewState> => {
      const project = requireProject(projectRef.current);
      const scene = findSelectedSceneDto(project, sceneFlow.state.selectedSceneId);

      const requestSeq = ++previewRequestSeqRef.current;

      if (scene === null) {
        const next = {
          ...createInitialPreviewState(),
          playbackStatus: "paused" as const,
          error: "Select a scene before previewing.",
        };
        return applyPreviewState(next);
      }

      const projectSnapshot = project.toSnapshot();
      const preview = new PreviewSceneUseCase({
        projectId: projectSnapshot.projectId,
        scene,
        assets: toAssetDtos(projectSnapshot.assets),
        characters: toCharacterDtos(projectSnapshot.characters),
        engineClient: new PyxelPreviewEngineClient(),
        width: projectSnapshot.settings.width,
        height: projectSnapshot.settings.height,
        fps: projectSnapshot.settings.fps,
        initialTime: time,
      });

      const next = await preview.seek(time);

      if (requestSeq !== previewRequestSeqRef.current) {
        return latestPreviewStateRef.current;
      }

      const nextState = { ...next, playbackStatus };
      applyPreviewState(nextState);
      setTimelineState(timeline.showScene(scene.sceneId));
      timeline.setPlayhead({ time: nextState.currentTime });
      setTimelineState(timeline.state);
      return nextState;
    },
    [applyPreviewState, sceneFlow.state.selectedSceneId, timeline],
  );

  const previewUseCase = useMemo(
    () => ({
      get state() {
        return previewState;
      },
      async play(): Promise<PreviewState> {
        playbackSessionRef.current += 1;
        return renderPreviewAt(previewState.currentTime, "playing");
      },
      pause(): PreviewState {
        playbackSessionRef.current += 1;
        previewRequestSeqRef.current += 1;
        const next = { ...latestPreviewStateRef.current, playbackStatus: "paused" as const, error: null };
        applyPreviewState(next);
        return next;
      },
      async seek(time: number): Promise<PreviewState> {
        const nextPlaybackStatus = latestPreviewStateRef.current.playbackStatus;
        if (nextPlaybackStatus === "paused") {
          previewRequestSeqRef.current += 1;
        }
        return renderPreviewAt(time, nextPlaybackStatus);
      },
    }),
    [previewState, renderPreviewAt],
  );

  useEffect(() => {
    if (previewState.playbackStatus !== "playing" || selectedSceneDuration <= 0) {
      return;
    }

    const frameDurationMs = Math.max(1000 / previewState.fps, 16);
    const playbackSession = playbackSessionRef.current;
    const timer = window.setTimeout(() => {
      if (playbackSession !== playbackSessionRef.current || latestPreviewStateRef.current.playbackStatus !== "playing") {
        return;
      }

      const nextTime = Math.min(latestPreviewStateRef.current.currentTime + frameDurationMs / 1000, selectedSceneDuration);
      const nextStatus = nextTime >= selectedSceneDuration ? "paused" : "playing";
      if (nextStatus === "paused") {
        playbackSessionRef.current += 1;
      }
      void renderPreviewAt(nextTime, nextStatus);
    }, frameDurationMs);

    return () => window.clearTimeout(timer);
  }, [previewState.currentTime, previewState.fps, previewState.playbackStatus, renderPreviewAt, selectedSceneDuration]);

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
      updateAsset(input: import("../../../app/src").UpdateAssetInput): AssetLibraryState {
        const next = assetLibrary.updateAsset(input);
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

  const sceneFlowUseCase = useMemo(
    () => ({
      get state() {
        return sceneState;
      },
      addScene(input: AddSceneInput): SceneFlowState {
        const next = sceneFlow.addScene(input);
        setSceneState(next);
        const selectedSceneId = next.selectedSceneId ?? next.scenes[next.scenes.length - 1]?.sceneId ?? null;
        setInspectorState(selectedSceneId === null ? inspector.clearSelection() : inspector.selectScene(selectedSceneId));
        setTimelineState(timeline.showScene(selectedSceneId));
        return next;
      },
      deleteScene(sceneId: string): SceneFlowState {
        const next = sceneFlow.deleteScene(sceneId);
        setSceneState(next);
        setInspectorState(next.selectedSceneId === null ? inspector.clearSelection() : inspector.selectScene(next.selectedSceneId));
        setTimelineState(timeline.showScene(next.selectedSceneId));
        return next;
      },
      moveScene(input: MoveSceneInput): SceneFlowState {
        const next = sceneFlow.moveScene(input);
        setSceneState(next);
        setInspectorState(inspector.selectScene(input.sceneId));
        setTimelineState(timeline.showScene(input.sceneId));
        return next;
      },
      selectScene(sceneId: string): SceneFlowState {
        const next = sceneFlow.selectScene(sceneId);
        setSceneState(next);
        setInspectorState(inspector.selectScene(sceneId));
        setTimelineState(timeline.showScene(sceneId));
        return next;
      },
    }),
    [inspector, sceneFlow, sceneState, timeline],
  );

  const inspectorUseCase = useMemo(
    () => ({
      get state() {
        return inspectorState;
      },
      clearSelection(): InspectorState {
        const next = inspector.clearSelection();
        setInspectorState(next);
        return next;
      },
      selectScene(sceneId: string): InspectorState {
        const next = inspector.selectScene(sceneId);
        setInspectorState(next);
        return next;
      },
      selectCharacter(characterId: string): InspectorState {
        const next = inspector.selectCharacter(characterId);
        setInspectorState(next);
        return next;
      },
      selectAction(sceneId: string, actionId: string): InspectorState {
        const next = inspector.selectAction(sceneId, actionId);
        setInspectorState(next);
        return next;
      },
      renameSelectedScene(input: RenameSceneInput): InspectorState {
        const next = inspector.renameSelectedScene(input);
        setInspectorState(next);
        setSceneState(sceneFlow.state);
        setTimelineState(timeline.state);
        persistCurrentProject();
        return next;
      },
      changeSelectedSceneDuration(input: ChangeSceneDurationInput): InspectorState {
        const next = inspector.changeSelectedSceneDuration(input);
        setInspectorState(next);
        setSceneState(sceneFlow.state);
        setTimelineState(timeline.state);
        persistCurrentProject();
        return next;
      },
      changeSelectedSceneBackground(input: ChangeSceneBackgroundInput): InspectorState {
        const next = inspector.changeSelectedSceneBackground(input);
        setInspectorState(next);
        setSceneState(sceneFlow.state);
        persistCurrentProject();
        return next;
      },
      renameSelectedCharacter(input: RenameCharacterInput): InspectorState {
        const next = inspector.renameSelectedCharacter(input);
        setInspectorState(next);
        persistCurrentProject();
        return next;
      },
      changeSelectedActionTimeRange(input: ChangeActionTimeRangeInput): InspectorState {
        const next = inspector.changeSelectedActionTimeRange(input);
        setInspectorState(next);
        setTimelineState(timeline.state);
        persistCurrentProject();
        return next;
      },
      changeSelectedActionTarget(input: ChangeActionTargetInput): InspectorState {
        const next = inspector.changeSelectedActionTarget(input);
        setInspectorState(next);
        setTimelineState(timeline.state);
        persistCurrentProject();
        return next;
      },
      changeSelectedActionPayload(input: ChangeActionPayloadInput): InspectorState {
        const next = inspector.changeSelectedActionPayload(input);
        setInspectorState(next);
        setTimelineState(timeline.state);
        persistCurrentProject();
        return next;
      },
    }),
    [inspector, inspectorState, sceneFlow, timeline],
  );

  const timelineUseCase = useMemo(
    () => ({
      get state() {
        return timelineState;
      },
      showScene(sceneId: string | null): TimelineState {
        const next = timeline.showScene(sceneId);
        setTimelineState(next);
        return next;
      },
      setPlayhead(input: { time: number }): TimelineState {
        const next = timeline.setPlayhead(input);
        setTimelineState(next);
        return next;
      },
      setTimeScale(input: { timeScale: number }): TimelineState {
        const next = timeline.setTimeScale(input);
        setTimelineState(next);
        return next;
      },
      moveItem(input: MoveTimelineItemInput): TimelineState {
        const next = timeline.moveItem(input);
        setTimelineState(next);
        setInspectorState(inspector.selectAction(input.sceneId, input.actionId));
        persistCurrentProject();
        return next;
      },
      resizeItemStart(input: ResizeTimelineItemStartInput): TimelineState {
        const next = timeline.resizeItemStart(input);
        setTimelineState(next);
        setInspectorState(inspector.selectAction(input.sceneId, input.actionId));
        persistCurrentProject();
        return next;
      },
      resizeItemEnd(input: ResizeTimelineItemEndInput): TimelineState {
        const next = timeline.resizeItemEnd(input);
        setTimelineState(next);
        setInspectorState(inspector.selectAction(input.sceneId, input.actionId));
        persistCurrentProject();
        return next;
      },
    }),
    [inspector, timeline, timelineState],
  );


  const createAction = (kind: CreateActionKind): TimelineState => {
    const sceneId = timeline.state.sceneId;

    if (sceneId === null) {
      throw new Error("Select a scene before creating an action.");
    }

    const result = actionEditor.createAction({
      sceneId,
      kind,
      startTime: timeline.state.playhead,
    });
    const nextTimeline = timeline.showScene(sceneId);
    setTimelineState(nextTimeline);
    setInspectorState(inspector.selectAction(result.sceneId, result.action.actionId));
    persistCurrentProject();
    return nextTimeline;
  };


  const generateSelectedActionVoice = async (sceneId: string, actionId: string): Promise<InspectorState> => {
    try {
      setVoiceStatus("Generating voice...");
      const result = await generateVoice.generateForTalkAction({ sceneId, actionId });
      setAssetState(assetLibrary.state);
      const nextInspector = inspector.selectAction(sceneId, actionId);
      setInspectorState(nextInspector);
      setTimelineState(timeline.showScene(sceneId));
      persistCurrentProject();
      setVoiceStatus(`Generated voice: ${result.voiceAssetPath}`);
      return nextInspector;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Voice generation failed.";
      setVoiceStatus(message);
      throw error;
    }
  };

  const playSelectedActionVoice = async (voiceAssetPath: string): Promise<void> => {
    try {
      setVoiceStatus(`Playing voice: ${voiceAssetPath}`);
      await voicePreviewPlayer.play(voiceAssetPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Voice preview playback failed.";
      setVoiceStatus(message);
      throw error;
    }
  };

  const stopSelectedActionVoice = (): void => {
    voicePreviewPlayer.stop();
    setVoiceStatus("Voice preview stopped.");
  };

  const deleteAction = (sceneId: string, actionId: string): TimelineState => {
    actionEditor.deleteAction({ sceneId, actionId });
    const nextTimeline = timeline.showScene(sceneId);
    setTimelineState(nextTimeline);
    setInspectorState(inspector.selectScene(sceneId));
    return nextTimeline;
  };

  const layout = new StudioLayout({
    preview: new PreviewPanel({ duration: selectedSceneDuration, preview: previewUseCase }).render(),
    assetBrowser: new AssetBrowser({ assets: assetBrowserUseCase }).render(),
    sceneFlow: new SceneFlow({ scenes: sceneFlowUseCase }).render(),
    inspector: new Inspector({ inspector: inspectorUseCase }).render(),
    timeline: new Timeline({ timeline: timelineUseCase }).render(),
  }).render();

  return (
    <StudioWorkspace
      view={layout}
      onAddAsset={assetBrowserUseCase.addAsset}
      onAddScene={sceneFlowUseCase.addScene}
      onDeleteScene={sceneFlowUseCase.deleteScene}
      onMoveScene={sceneFlowUseCase.moveScene}
      onPlay={previewUseCase.play}
      onPause={previewUseCase.pause}
      onSeek={previewUseCase.seek}
      onSelectAsset={assetBrowserUseCase.selectAsset}
      onSelectScene={sceneFlowUseCase.selectScene}
      onEditSceneName={(sceneId, sceneName) => inspectorUseCase.renameSelectedScene({ sceneId, sceneName })}
      onEditSceneDuration={(sceneId, duration) => inspectorUseCase.changeSelectedSceneDuration({ sceneId, duration })}
      onEditSceneBackground={(sceneId, backgroundAssetId) =>
        inspectorUseCase.changeSelectedSceneBackground({ sceneId, backgroundAssetId })
      }
      onEditActionTarget={(sceneId, actionId, targetId) =>
        inspectorUseCase.changeSelectedActionTarget({ sceneId, actionId, targetId })
      }
      onEditActionPayload={(sceneId, actionId, payload) =>
        inspectorUseCase.changeSelectedActionPayload({ sceneId, actionId, payload })
      }
      onGenerateActionVoice={generateSelectedActionVoice}
      onPlayActionVoice={playSelectedActionVoice}
      onStopActionVoice={stopSelectedActionVoice}
      voiceStatus={voiceStatus}
      onSetTimelinePlayhead={(time) => timelineUseCase.setPlayhead({ time })}
      onSetTimelineScale={(timeScale) => timelineUseCase.setTimeScale({ timeScale })}
      onMoveTimelineItem={timelineUseCase.moveItem}
      onResizeTimelineItemStart={timelineUseCase.resizeItemStart}
      onResizeTimelineItemEnd={timelineUseCase.resizeItemEnd}
      onCreateAction={createAction}
      onDeleteAction={deleteAction}
      onSelectAction={(sceneId, actionId) => {
        const next = inspector.selectAction(sceneId, actionId);
        setInspectorState(next);
        return next;
      }}
    />
  );
}

type StudioWorkspaceProps = {
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
  const preview = view.layout.center.preview;

  useEffect(() => {
    setSeekValue(preview.seekControl.value);
  }, [preview.seekControl.value]);

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
                onBlur={commitSeek}
                onChange={(event) => {
                  setSeekValue(Number(event.currentTarget.value));
                }}
                onKeyUp={(event) => {
                  if (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "Home" || event.key === "End") {
                    commitSeek();
                  }
                }}
                onPointerUp={commitSeek}
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

function requireProject(project: Project | null): Project {
  if (project === null) {
    throw new Error("Project is not initialized.");
  }

  return project;
}

function findSelectedSceneDto(project: Project, selectedSceneId: string | null): SceneDto | null {
  const snapshot = project.toSnapshot();
  const scene = snapshot.scenes.find((currentScene) => currentScene.sceneId === selectedSceneId) ?? snapshot.scenes[0] ?? null;

  if (scene === null) {
    return null;
  }

  return {
    sceneId: scene.sceneId,
    sceneName: scene.sceneName,
    duration: scene.duration,
    backgroundAssetId: scene.backgroundAssetId,
    characterIds: scene.characters.map((character) => character.instanceId),
    actions: scene.actions.map((action) => ({
      actionId: action.actionId,
      actionType: toActionDtoType(action.actionType),
      startTime: action.startTime,
      endTime: action.endTime,
      targetId: action.targetId,
      payload: action.payload,
    })),
  };
}

function toAssetDtos(assets: ReturnType<Project["toSnapshot"]>["assets"]): AssetDto[] {
  return assets.map((asset) => ({
    assetId: asset.assetId,
    assetName: asset.assetName,
    assetType: toAssetDtoType(asset.assetType),
    assetPath: asset.assetPath,
  }));
}

function toCharacterDtos(characters: ReturnType<Project["toSnapshot"]>["characters"]): CharacterDto[] {
  return characters.map((character) => ({
    characterId: character.characterId,
    characterName: character.characterName,
    imageMapId: null,
  }));
}

function toActionDtoType(actionType: string): SceneDto["actions"][number]["actionType"] {
  const knownTypes = ["talk", "move", "fade", "flash", "camera_move", "camera_zoom"] as const;
  return knownTypes.some((knownType) => knownType === actionType) ? actionType as SceneDto["actions"][number]["actionType"] : "custom";
}

function toAssetDtoType(assetType: string): AssetDto["assetType"] {
  const knownTypes = ["background", "character_image", "voice", "bgm", "se", "effect"] as const;
  return knownTypes.some((knownType) => knownType === assetType) ? assetType as AssetDto["assetType"] : "effect";
}

function createInitialProject(): Project {
  const storedProject = loadBrowserProject();

  if (storedProject !== null) {
    return storedProject;
  }

  const project = Project.create({ projectId: "project-local-preview", projectName: "Local Preview" });

  project.addAsset(
    Asset.create({
      assetId: "asset-bg-opening",
      assetName: "Opening Background",
      assetType: "background",
      assetPath: "assets/backgrounds/opening.png",
    }),
  );

  project.addScene(
    Scene.create({
      sceneId: "scene-opening",
      sceneName: "Opening",
      duration: 8,
      backgroundAssetId: "asset-bg-opening",
      actions: [
        Action.create({
          actionId: "action-talk-opening",
          actionType: "talk",
          startTime: 0.5,
          endTime: 2.5,
          targetId: "character-zundamon",
          payload: { text: "今日のテーマを説明するのだ。" },
        }).toSnapshot(),
        Action.create({
          actionId: "action-character-nod",
          actionType: "move",
          startTime: 2.5,
          endTime: 4,
          targetId: "character-zundamon",
          payload: { x: 8, y: 0 },
        }).toSnapshot(),
        Action.create({
          actionId: "action-flash-emphasis",
          actionType: "flash",
          startTime: 4.2,
          endTime: 4.8,
          targetId: null,
          payload: { intensity: 0.7 },
        }).toSnapshot(),
        Action.create({
          actionId: "action-camera-zoom",
          actionType: "camera_zoom",
          startTime: 5,
          endTime: 7,
          targetId: "camera-main",
          payload: { zoom: 1.15 },
        }).toSnapshot(),
      ],
    }),
  );

  return project;
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

class BrowserSceneIdGenerator implements IdGenerator {
  generate(prefix: string): string {
    return `${prefix}-${crypto.randomUUID()}`;
  }
}

class BrowserActionIdGenerator implements IdGenerator {
  generate(prefix: string): string {
    return `${prefix}-${crypto.randomUUID()}`;
  }
}

class BrowserVoiceIdGenerator implements IdGenerator {
  generate(prefix: string): string {
    return `${prefix}-${crypto.randomUUID()}`;
  }
}
