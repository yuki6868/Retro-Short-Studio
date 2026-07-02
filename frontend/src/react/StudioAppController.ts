import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  AssetBrowser,
  Inspector,
  PreviewPanel,
  PreviewPlaybackLoop,
  SceneFlow,
  StudioLayout,
  Timeline,
} from "../index";
import {
  type AddAssetInput,
  type AddSceneInput,
  type AssetLibraryState,
  type ChangeActionPayloadInput,
  type ChangeActionTargetInput,
  type ChangeSceneBackgroundInput,
  type ChangeSceneDurationInput,
  type ChangeActionTimeRangeInput,
  type CreateActionKind,
  type InspectorState,
  type MoveSceneInput,
  type MoveTimelineItemInput,
  PreviewTimelineSyncUseCase,
  type PreviewState,
  type RenameCharacterInput,
  type RenameSceneInput,
  type ResizeTimelineItemEndInput,
  type ResizeTimelineItemStartInput,
  type SceneFlowState,
  type TimelineState,
  type UpdateAssetInput,
} from "../../../app/src";
import { findSelectedSceneDto, PreviewController } from "./PreviewController";
import { createStudioCompositionRoot } from "./StudioCompositionRoot";
import type { StudioWorkspaceProps } from "./StudioWorkspace";

export type StudioAppControllerConfig = {
  onRequestWorkspaceReload?: () => void;
};

export function useStudioAppController(config: StudioAppControllerConfig = {}): StudioWorkspaceProps {
  const [previewState, setPreviewState] = useState<PreviewState>(createInitialPreviewState);
  const latestPreviewStateRef = useRef<PreviewState>(previewState);
  const selectedSceneDurationRef = useRef(0);
  const playbackLoopRef = useRef<PreviewPlaybackLoop | null>(null);
  const compositionRootRef = useRef<ReturnType<typeof createStudioCompositionRoot> | null>(null);

  if (compositionRootRef.current === null) {
    compositionRootRef.current = createStudioCompositionRoot();
  }

  const projectSession = compositionRootRef.current.projectSession;
  const voicePreviewController = compositionRootRef.current.voicePreviewController;
  const project = projectSession.project;
  const { assetLibrary, sceneFlow, inspector, timeline, actionEditor } = projectSession.useCases;

  projectSession.bootstrapSelection();

  const persistCurrentProject = (): void => {
    projectSession.persist();
  };

  const saveProjectFromToolbar = (projectName: string): void => {
    const savedProject = projectSession.persist(projectName);
    setSavedProjects(projectSession.listSavedProjects());
    setSelectedSavedProjectId(savedProject?.projectId ?? projectSession.getActiveSavedProjectId());
    setProjectPersistenceStatus(savedProject === null ? "Project save is unavailable" : `Project saved: ${savedProject.projectName}`);
  };

  const saveProjectAsNewFromToolbar = (projectName: string): void => {
    const trimmedProjectName = projectName.trim();

    if (trimmedProjectName.length === 0) {
      setProjectPersistenceStatus("Project name is required");
      return;
    }

    if (projectSession.hasSavedProjectNamed(trimmedProjectName)) {
      setProjectPersistenceStatus(`Project already exists: ${trimmedProjectName}`);
      return;
    }

    const savedProject = projectSession.persistAsNew(trimmedProjectName);
    setSavedProjects(projectSession.listSavedProjects());
    setSelectedSavedProjectId(savedProject?.projectId ?? projectSession.getActiveSavedProjectId());

    if (savedProject === null) {
      setProjectPersistenceStatus("Project save is unavailable");
      return;
    }

    setProjectPersistenceStatus(`Project saved as new: ${savedProject.projectName}`);
    config.onRequestWorkspaceReload?.();
  };

  const openSavedProjectFromToolbar = (projectId: string): void => {
    if (!projectSession.hasSavedProject()) {
      setProjectPersistenceStatus("No saved project");
      return;
    }

    projectSession.selectSavedProject(projectId);
    setSelectedSavedProjectId(projectId);
    config.onRequestWorkspaceReload?.();
  };

  const [assetState, setAssetState] = useState<AssetLibraryState>(assetLibrary.state);
  const [sceneState, setSceneState] = useState<SceneFlowState>(sceneFlow.state);
  const [inspectorState, setInspectorState] = useState<InspectorState>(inspector.state);
  const [timelineState, setTimelineState] = useState<TimelineState>(timeline.state);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const [projectPersistenceStatus, setProjectPersistenceStatus] = useState<string | null>(null);
  const [savedProjects, setSavedProjects] = useState(() => projectSession.listSavedProjects());
  const [selectedSavedProjectId, setSelectedSavedProjectId] = useState<string | null>(() =>
    projectSession.getActiveSavedProjectId(),
  );
  const previewTimelineSyncRef = useRef<PreviewTimelineSyncUseCase | null>(null);

  if (previewTimelineSyncRef.current === null) {
    previewTimelineSyncRef.current = new PreviewTimelineSyncUseCase({ project, timeline, inspector });
  }

  const previewTimelineSync = previewTimelineSyncRef.current;

  const applyPreviewTimelineSync = (currentTime: number): TimelineState => {
    const result = previewTimelineSync.syncPreviewCurrentTime({
      sceneId: sceneFlow.state.selectedSceneId,
      currentTime,
    });

    if (result.inspectorState !== null) {
      setInspectorState(result.inspectorState);
    }

    return result.timelineState;
  };

  const seekTimelineAndPreview = (time: number): TimelineState => {
    const result = previewTimelineSync.seekTimeline({
      sceneId: sceneFlow.state.selectedSceneId,
      time,
    });

    setTimelineState(result.timelineState);

    if (result.inspectorState !== null) {
      setInspectorState(result.inspectorState);
    }

    void previewUseCase.seek(result.timelineState.playhead);
    return result.timelineState;
  };

  const selectedSceneForPreview = findSelectedSceneDto(project, sceneFlow.state.selectedSceneId);
  const selectedSceneDuration = selectedSceneForPreview?.duration ?? 0;
  selectedSceneDurationRef.current = selectedSceneDuration;

  const applyPreviewState = useCallback((next: PreviewState): PreviewState => {
    latestPreviewStateRef.current = next;
    setPreviewState(next);
    return next;
  }, []);

  const previewControllerRef = useRef<PreviewController | null>(null);

  if (previewControllerRef.current === null) {
    previewControllerRef.current = new PreviewController({
      getProject: () => project,
      getSelectedSceneId: () => sceneFlow.state.selectedSceneId,
      getTimeline: () => timeline,
      applyPreviewState,
      setTimelineState,
      syncPreviewCurrentTime: ({ currentTime }) => applyPreviewTimelineSync(currentTime),
      createInitialPreviewState,
      audioController: compositionRootRef.current.previewAudioController,
    });
  }

  const previewController = previewControllerRef.current;
  previewController.setLatestState(previewState);

  const previewUseCase = useMemo(
    () => ({
      get state() {
        return previewState;
      },
      async play(): Promise<PreviewState> {
        return previewController.play(previewState.currentTime);
      },
      pause(): PreviewState {
        return previewController.pause();
      },
      async seek(time: number): Promise<PreviewState> {
        playbackLoopRef.current?.pause();
        const next = await previewController.seek(time);
        playbackLoopRef.current?.seek();

        if (next.playbackStatus === "playing" && selectedSceneDurationRef.current > 0) {
          playbackLoopRef.current?.start();
        }

        return next;
      },
    }),
    [previewController, previewState],
  );

  if (playbackLoopRef.current === null) {
    playbackLoopRef.current = new PreviewPlaybackLoop({
      getState: () => latestPreviewStateRef.current,
      getDuration: () => selectedSceneDurationRef.current,
      advance: (deltaSeconds) =>
        previewController.advancePlayingFrame(
          deltaSeconds,
          selectedSceneDurationRef.current,
          previewController.currentPlaybackSession,
        ),
    });
  }

  useEffect(() => {
    const playbackLoop = playbackLoopRef.current;

    if (playbackLoop === null) {
      return;
    }

    if (previewState.playbackStatus === "playing" && selectedSceneDuration > 0) {
      playbackLoop.start();
      return;
    }

    playbackLoop.pause();
  }, [previewState.playbackStatus, selectedSceneDuration]);

  useEffect(() => () => playbackLoopRef.current?.stop(), []);

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
      updateAsset(input: UpdateAssetInput): AssetLibraryState {
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


  const generateSelectedActionVoice = async (sceneId: string, actionId: string): Promise<InspectorState> =>
    voicePreviewController.generateSelectedActionVoice({
      sceneId,
      actionId,
      assetLibrary,
      inspector,
      timeline,
      setAssetState: () => setAssetState(assetLibrary.state),
      setInspectorState,
      setTimelineState: () => setTimelineState(timeline.showScene(sceneId)),
      setStatus: setVoiceStatus,
    });

  const playSelectedActionVoice = async (voiceAssetPath: string): Promise<void> =>
    voicePreviewController.playSelectedActionVoice(voiceAssetPath, setVoiceStatus);

  const stopSelectedActionVoice = (): void => {
    voicePreviewController.stopSelectedActionVoice(setVoiceStatus);
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

  return {
    view: layout,
    onAddAsset: assetBrowserUseCase.addAsset,
    onAddScene: sceneFlowUseCase.addScene,
    onDeleteScene: sceneFlowUseCase.deleteScene,
    onMoveScene: sceneFlowUseCase.moveScene,
    onPlay: previewUseCase.play,
    onPause: previewUseCase.pause,
    onSeek: previewUseCase.seek,
    onSelectAsset: assetBrowserUseCase.selectAsset,
    onSelectScene: sceneFlowUseCase.selectScene,
    onEditSceneName: (sceneId, sceneName) => inspectorUseCase.renameSelectedScene({ sceneId, sceneName }),
    onEditSceneDuration: (sceneId, duration) => inspectorUseCase.changeSelectedSceneDuration({ sceneId, duration }),
    onEditSceneBackground: (sceneId, backgroundAssetId) =>
      inspectorUseCase.changeSelectedSceneBackground({ sceneId, backgroundAssetId }),
    onEditActionTimeRange: (sceneId, actionId, startTime, endTime) =>
      inspectorUseCase.changeSelectedActionTimeRange({ sceneId, actionId, startTime, endTime }),
    onEditActionTarget: (sceneId, actionId, targetId) =>
      inspectorUseCase.changeSelectedActionTarget({ sceneId, actionId, targetId }),
    onEditActionPayload: (sceneId, actionId, payload) =>
      inspectorUseCase.changeSelectedActionPayload({ sceneId, actionId, payload }),
    onGenerateActionVoice: generateSelectedActionVoice,
    onPlayActionVoice: playSelectedActionVoice,
    onStopActionVoice: stopSelectedActionVoice,
    voiceStatus,
    projectName: project.toSnapshot().projectName,
    savedProjects,
    selectedSavedProjectId,
    projectPersistenceStatus,
    onSaveProject: saveProjectFromToolbar,
    onSaveProjectAsNew: saveProjectAsNewFromToolbar,
    onOpenProject: openSavedProjectFromToolbar,
    onSetTimelinePlayhead: seekTimelineAndPreview,
    onSetTimelineScale: (timeScale) => timelineUseCase.setTimeScale({ timeScale }),
    onMoveTimelineItem: timelineUseCase.moveItem,
    onResizeTimelineItemStart: timelineUseCase.resizeItemStart,
    onResizeTimelineItemEnd: timelineUseCase.resizeItemEnd,
    onCreateAction: createAction,
    onDeleteAction: deleteAction,
    onSelectAction: (sceneId, actionId) => {
      const next = inspector.selectAction(sceneId, actionId);
      setInspectorState(next);
      return next;
    },
  };
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
