import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent, type ReactElement } from "react";

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
  SceneTemplateState,
  TimelineState,
  AddAssetInput,
  AddSceneInput,
  ImportableAssetType,
  AssignCharacterImageInput,
  ChangeCharacterVariantSelectionInput,
  CharacterModelEditorState,
  AddCharacterInstanceInput,
  RemoveCharacterInstanceInput,
  SceneCharacterPlacementState,
  SelectCharacterInstanceInput,
  UpdateCharacterInstanceInput,
} from "../../../app/src";
import { TalkActionInspector, TimelineInteractionMapper, type BrowserProjectSummary, type StudioLayoutViewState, type TimelineItemViewState, type CharacterModelEditorViewState } from "../index";

export type StudioWorkspaceProps = {
  view: StudioLayoutViewState;
  characterModelEditor?: CharacterModelEditorViewState;
  onAddAsset(input: AddAssetInput): AssetLibraryState;
  onImportAsset?(input: { assetType: ImportableAssetType; file: File }): Promise<AssetLibraryState>;
  sceneTemplates?: SceneTemplateState;
  onSaveSceneAsTemplate?(sceneId: string): SceneTemplateState;
  onCreateSceneFromTemplate?(templateId: string): SceneFlowState;
  onDeleteSceneTemplate?(templateId: string): SceneTemplateState;
  onAddScene(input: AddSceneInput): SceneFlowState;
  onDeleteScene(sceneId: string): SceneFlowState;
  onMoveScene(input: MoveSceneInput): SceneFlowState;
  onPlay(): Promise<PreviewState>;
  onPause(): PreviewState;
  onSeek(time: number): Promise<PreviewState>;
  onSelectAsset(assetId: string): AssetLibraryState;
  onDeleteAsset?(assetId: string): AssetLibraryState;
  onSelectScene(sceneId: string): SceneFlowState;
  onCreateCharacterModel?(input: { characterName: string }): CharacterModelEditorState;
  onSelectCharacterModel?(characterId: string): CharacterModelEditorState;
  onRenameCharacterModel?(input: { characterId: string; characterName: string }): CharacterModelEditorState;
  onChangeCharacterDefaults?(input: { characterId: string; defaultExpression?: string; defaultEye?: string; defaultMouth?: string; defaultMotion?: string }): CharacterModelEditorState;
  onChangeCharacterVariantSelection?(input: ChangeCharacterVariantSelectionInput): CharacterModelEditorState;
  onAssignCharacterImage?(input: AssignCharacterImageInput): CharacterModelEditorState;
  sceneCharacters?: SceneCharacterPlacementState;
  onAddSceneCharacter?(input: AddCharacterInstanceInput): SceneCharacterPlacementState;
  onUpdateSceneCharacter?(input: UpdateCharacterInstanceInput): SceneCharacterPlacementState;
  onRemoveSceneCharacter?(input: RemoveCharacterInstanceInput): SceneCharacterPlacementState;
  onSelectSceneCharacter?(input: SelectCharacterInstanceInput): SceneCharacterPlacementState;
  onEditSceneName(sceneId: string, sceneName: string): InspectorState;
  onEditSceneDuration(sceneId: string, duration: number): InspectorState;
  onEditSceneBackground?: (sceneId: string, backgroundAssetId: string | null) => InspectorState;
  onEditActionTimeRange?: (sceneId: string, actionId: string, startTime: number, endTime: number) => InspectorState;
  onEditActionTarget?: (sceneId: string, actionId: string, targetId: string | null) => InspectorState;
  onEditActionPayload?: (sceneId: string, actionId: string, payload: Record<string, string | number | boolean | null>) => InspectorState;
  onGenerateActionVoice?: (sceneId: string, actionId: string) => Promise<InspectorState>;
  onPlayActionVoice?: (voiceAssetPath: string) => Promise<void>;
  onStopActionVoice?: () => void;
  voiceStatus?: string | null;
  assetImportStatus?: string | null;
  onSetTimelinePlayhead?: (time: number) => TimelineState;
  onSetTimelineScale?: (timeScale: number) => TimelineState;
  onMoveTimelineItem?: (input: MoveTimelineItemInput) => TimelineState;
  onResizeTimelineItemStart?: (input: ResizeTimelineItemStartInput) => TimelineState;
  onResizeTimelineItemEnd?: (input: ResizeTimelineItemEndInput) => TimelineState;
  onCreateAction?: (kind: CreateActionKind) => TimelineState;
  onDeleteAction?: (sceneId: string, actionId: string) => TimelineState;
  onSelectAction?: (sceneId: string, actionId: string) => InspectorState;
  projectName?: string;
  savedProjects?: BrowserProjectSummary[];
  selectedSavedProjectId?: string | null;
  onSaveProject?: (projectName: string) => void;
  onSaveProjectAsNew?: (projectName: string) => void;
  onOpenProject?: (projectId: string) => void;
  onChooseProjectFolder?: () => Promise<void>;
  onOpenPixelEditor?: (input?: { characterTarget?: { characterId: string; kind: AssignCharacterImageInput["kind"]; state: string } }) => void;
  onExportMp4?: () => Promise<void>;
  projectFolderStatus?: string | null;
  projectPersistenceStatus?: string | null;
  exportStatus?: string | null;
};

export function shouldApplyAssetSelectionToSceneBackground(input: {
  assetType: string;
  selectedSceneId: string | null;
}): boolean {
  return input.assetType === "background" && input.selectedSceneId !== null;
}

export function StudioWorkspace({
  view,
  characterModelEditor,
  onAddAsset,
  onImportAsset,
  sceneTemplates,
  onSaveSceneAsTemplate,
  onCreateSceneFromTemplate,
  onDeleteSceneTemplate,
  onAddScene,
  onDeleteScene,
  onMoveScene,
  onPlay,
  onPause,
  onSeek,
  onSelectAsset,
  onDeleteAsset,
  onSelectScene,
  onCreateCharacterModel,
  onSelectCharacterModel,
  onRenameCharacterModel,
  onChangeCharacterDefaults,
  onChangeCharacterVariantSelection,
  onAssignCharacterImage,
  sceneCharacters,
  onAddSceneCharacter,
  onUpdateSceneCharacter,
  onRemoveSceneCharacter,
  onSelectSceneCharacter,
  onEditSceneName,
  onEditSceneDuration,
  onEditSceneBackground,
  onEditActionTimeRange,
  onEditActionTarget,
  onEditActionPayload,
  onGenerateActionVoice,
  onPlayActionVoice,
  onStopActionVoice,
  voiceStatus,
  assetImportStatus,
  onSetTimelinePlayhead,
  onSetTimelineScale,
  onMoveTimelineItem,
  onResizeTimelineItemStart,
  onResizeTimelineItemEnd,
  onCreateAction,
  onDeleteAction,
  onSelectAction,
  projectName = "Local Preview",
  savedProjects = [],
  selectedSavedProjectId = null,
  onSaveProject,
  onSaveProjectAsNew,
  onOpenProject,
  onChooseProjectFolder,
  onOpenPixelEditor,
  onExportMp4,
  projectFolderStatus,
  projectPersistenceStatus,
  exportStatus,
}: StudioWorkspaceProps): ReactElement {
  const [seekValue, setSeekValue] = useState(view.layout.center.preview.seekControl.value);
  const [isSeekEditing, setIsSeekEditing] = useState(false);
  const lastCommittedSeekValueRef = useRef<number | null>(null);
  const preview = view.layout.center.preview;
  const [saveProjectName, setSaveProjectName] = useState(projectName);
  const [importAssetType, setImportAssetType] = useState<ImportableAssetType>("background");
  const [openProjectId, setOpenProjectId] = useState(selectedSavedProjectId ?? savedProjects[0]?.projectId ?? "");
  const selectedTimelineCharacterId = sceneCharacters?.selectedInstanceId ?? "";
  const placedTimelineCharacters = sceneCharacters?.placedCharacters ?? [];

  useEffect(() => {
    if (!isSeekEditing) {
      setSeekValue(preview.seekControl.value);
    }
  }, [isSeekEditing, preview.seekControl.value]);

  useEffect(() => {
    setSaveProjectName(projectName);
  }, [projectName]);

  useEffect(() => {
    setOpenProjectId(selectedSavedProjectId ?? savedProjects[0]?.projectId ?? "");
  }, [savedProjects, selectedSavedProjectId]);

  const commitSeek = (time: number): void => {
    if (!Number.isFinite(time)) {
      return;
    }

    if (lastCommittedSeekValueRef.current === time) {
      return;
    }

    lastCommittedSeekValueRef.current = time;
    void onSeek(time);
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
        <nav className="rss-project-toolbar" aria-label="Project controls">
          <label>
            Project name
            <input
              aria-label="Project name"
              onChange={(event: ChangeEvent<HTMLInputElement>) => setSaveProjectName(event.target.value)}
              type="text"
              value={saveProjectName}
            />
          </label>
          <button onClick={() => onSaveProject?.(saveProjectName)} type="button">
            Save Project
          </button>
          <button onClick={() => onSaveProjectAsNew?.(saveProjectName)} type="button">
            Save As New Project
          </button>
          <label>
            Open
            <select
              aria-label="Saved projects"
              disabled={savedProjects.length === 0}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => setOpenProjectId(event.target.value)}
              value={openProjectId}
            >
              {savedProjects.length === 0 ? <option value="">No saved projects</option> : null}
              {savedProjects.map((project) => (
                <option key={project.projectId} value={project.projectId}>
                  {project.projectName}
                </option>
              ))}
            </select>
          </label>
          <button disabled={openProjectId.length === 0} onClick={() => onOpenProject?.(openProjectId)} type="button">
            Open Project
          </button>
          <button disabled={onChooseProjectFolder === undefined} onClick={() => void onChooseProjectFolder?.()} type="button">
            Choose Project Folder
          </button>
          <button disabled={onOpenPixelEditor === undefined} onClick={() => onOpenPixelEditor?.()} type="button">
            Open Pixel Editor
          </button>
          <button disabled={onExportMp4 === undefined || view.layout.bottom.timeline === null} onClick={() => void onExportMp4?.()} type="button">
            Export MP4
          </button>
          {projectFolderStatus !== null && projectFolderStatus !== undefined ? <output>{projectFolderStatus}</output> : null}
          {projectPersistenceStatus !== null ? <output>{projectPersistenceStatus}</output> : null}
          {exportStatus !== null && exportStatus !== undefined ? <output>{exportStatus}</output> : null}
        </nav>
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
                <label>
                  Import type
                  <select
                    aria-label="Import asset type"
                    onChange={(event: ChangeEvent<HTMLSelectElement>) => setImportAssetType(event.target.value as ImportableAssetType)}
                    value={importAssetType}
                  >
                    {assetBrowser.importableTypes.map((assetType) => (
                      <option key={assetType} value={assetType}>
                        {assetType}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Import Asset
                  <input
                    aria-label="Import asset file"
                    disabled={onImportAsset === undefined}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                      const file = event.currentTarget.files?.[0];

                      if (file !== undefined) {
                        void onImportAsset?.({ assetType: importAssetType, file }).catch(() => {
                          // Import errors are surfaced through assetImportStatus by the controller.
                        });
                      }

                      event.currentTarget.value = "";
                    }}
                    type="file"
                  />
                </label>
                {assetImportStatus !== null && assetImportStatus !== undefined ? <output>{assetImportStatus}</output> : null}
                {assetBrowser.assets.length === 0 ? <p>{assetBrowser.emptyText}</p> : null}
                <ul aria-label="Asset list">
                  {assetBrowser.assets.map((asset) => (
                    <li key={asset.assetId}>
                      <button
                        aria-pressed={asset.selected}
                        onClick={() => {
                          onSelectAsset(asset.assetId);

                          if (
                            shouldApplyAssetSelectionToSceneBackground({
                              assetType: asset.assetType,
                              selectedSceneId: sceneInspector?.sceneId ?? null,
                            })
                          ) {
                            onEditSceneBackground?.(sceneInspector!.sceneId, asset.assetId);
                          }
                        }}
                        type="button"
                      >
                        {asset.assetName} / {asset.assetType}
                      </button>
                      <button
                        disabled={onDeleteAsset === undefined}
                        onClick={() => onDeleteAsset?.(asset.assetId)}
                        type="button"
                      >
                        Delete
                      </button>
                      {shouldApplyAssetSelectionToSceneBackground({
                        assetType: asset.assetType,
                        selectedSceneId: sceneInspector?.sceneId ?? null,
                      }) && sceneInspector !== null ? (
                        <button
                          onClick={() => onEditSceneBackground?.(sceneInspector.sceneId, asset.assetId)}
                          type="button"
                        >
                          Set as scene background
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>



          {characterModelEditor !== undefined ? (
            <section className="rss-panel" aria-label={characterModelEditor.title}>
              <h2>{characterModelEditor.title}</h2>
              <button
                disabled={characterModelEditor.createButton.disabled}
                onClick={() =>
                  onCreateCharacterModel?.({
                    characterName: `Character ${characterModelEditor.characters.length + 1}`,
                  })
                }
                type="button"
              >
                {characterModelEditor.createButton.label}
              </button>
              {characterModelEditor.characters.length === 0 ? <p>{characterModelEditor.emptyText}</p> : null}
              <ul aria-label="Character model list">
                {characterModelEditor.characters.map((character) => (
                  <li key={character.characterId}>
                    <button
                      aria-pressed={character.selected}
                      onClick={() => onSelectCharacterModel?.(character.characterId)}
                      type="button"
                    >
                      {character.characterName}
                    </button>
                  </li>
                ))}
              </ul>
              {characterModelEditor.selectedCharacter !== null ? (
                <div className="rss-character-editor" aria-label="CharacterImageMap Editor">
                  <label>
                    Character name
                    <input
                      aria-label="Character model name"
                      defaultValue={characterModelEditor.selectedCharacter.characterName}
                      onBlur={(event) =>
                        onRenameCharacterModel?.({
                          characterId: characterModelEditor.selectedCharacter!.characterId,
                          characterName: event.currentTarget.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Default expression
                    <input
                      aria-label="Default expression"
                      defaultValue={characterModelEditor.selectedCharacter.defaultExpression}
                      onBlur={(event) =>
                        onChangeCharacterDefaults?.({
                          characterId: characterModelEditor.selectedCharacter!.characterId,
                          defaultExpression: event.currentTarget.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Default mouth
                    <select
                      aria-label="Default mouth"
                      onChange={(event) =>
                        onChangeCharacterDefaults?.({
                          characterId: characterModelEditor.selectedCharacter!.characterId,
                          defaultMouth: event.currentTarget.value,
                        })
                      }
                      value={characterModelEditor.selectedCharacter.defaultMouth}
                    >
                      <option value="closed">closed</option>
                      <option value="half">half</option>
                      <option value="open">open</option>
                    </select>
                  </label>
                  <label>
                    Default eye
                    <select
                      aria-label="Default eye"
                      onChange={(event) =>
                        onChangeCharacterDefaults?.({
                          characterId: characterModelEditor.selectedCharacter!.characterId,
                          defaultEye: event.currentTarget.value,
                        })
                      }
                      value={characterModelEditor.selectedCharacter.defaultEye}
                    >
                      <option value="open">open</option>
                      <option value="closed">closed</option>
                    </select>
                  </label>
                  <section className="rss-character-editor__variant" aria-label="Character Variant Selection">
                    <h3>Preview Variant</h3>
                    <p>Switch the current Expression / Eye / Mouth used by Preview without changing the character defaults.</p>
                    <label>
                      Preview expression
                      <select
                        aria-label="Preview expression"
                        onChange={(event) =>
                          onChangeCharacterVariantSelection?.({
                            characterId: characterModelEditor.selectedCharacter!.characterId,
                            expression: event.currentTarget.value,
                          })
                        }
                        value={
                          characterModelEditor.selectedCharacter.currentVariant?.expression ??
                          characterModelEditor.selectedCharacter.defaultExpression
                        }
                      >
                        <option value="neutral">neutral</option>
                        <option value="happy">happy</option>
                        <option value="angry">angry</option>
                        <option value="sad">sad</option>
                        <option value="surprised">surprised</option>
                      </select>
                    </label>
                    <label>
                      Preview eye
                      <select
                        aria-label="Preview eye"
                        onChange={(event) =>
                          onChangeCharacterVariantSelection?.({
                            characterId: characterModelEditor.selectedCharacter!.characterId,
                            eye: event.currentTarget.value,
                          })
                        }
                        value={
                          characterModelEditor.selectedCharacter.currentVariant?.eye ??
                          characterModelEditor.selectedCharacter.defaultEye
                        }
                      >
                        <option value="open">open</option>
                        <option value="closed">closed</option>
                      </select>
                    </label>
                    <label>
                      Preview mouth
                      <select
                        aria-label="Preview mouth"
                        onChange={(event) =>
                          onChangeCharacterVariantSelection?.({
                            characterId: characterModelEditor.selectedCharacter!.characterId,
                            mouth: event.currentTarget.value,
                          })
                        }
                        value={
                          characterModelEditor.selectedCharacter.currentVariant?.mouth ??
                          characterModelEditor.selectedCharacter.defaultMouth
                        }
                      >
                        <option value="closed">closed</option>
                        <option value="half">half</option>
                        <option value="open">open</option>
                      </select>
                    </label>
                  </section>
                  {characterModelEditor.selectedCharacter.imageSlots.map((slot) => (
                    <div className="rss-character-editor__image-slot" key={slot.key}>
                      <label>
                        {slot.label}
                        <select
                          aria-label={slot.label}
                          onChange={(event) => {
                            if (event.currentTarget.value.length === 0) {
                              return;
                            }

                            onAssignCharacterImage?.({
                              characterId: characterModelEditor.selectedCharacter!.characterId,
                              kind: slot.kind,
                              state: slot.state,
                              assetId: event.currentTarget.value,
                            });
                          }}
                          value={slot.assetId ?? ""}
                        >
                          <option value="">No image</option>
                          {characterModelEditor.characterImageAssets.map((asset) => (
                            <option key={asset.assetId} value={asset.assetId}>
                              {asset.assetName}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        disabled={onOpenPixelEditor === undefined}
                        onClick={() =>
                          onOpenPixelEditor?.({
                            characterTarget: {
                              characterId: characterModelEditor.selectedCharacter!.characterId,
                              kind: slot.kind,
                              state: slot.state,
                            },
                          })
                        }
                        type="button"
                      >
                        Edit Pixel
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

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
                {sceneTemplates !== undefined ? (
                  <section className="rss-scene-templates" aria-label="Scene templates">
                    <h3>Scene Templates</h3>
                    {sceneTemplates.templates.length === 0 ? <p>No scene templates saved.</p> : null}
                    <ul aria-label="Scene template list">
                      {sceneTemplates.templates.map((template) => (
                        <li key={template.templateId}>
                          <span>
                            {template.templateName} / {template.duration.toFixed(1)}s / {template.characterCount} chars / {template.actionCount} actions
                          </span>
                          <button onClick={() => onCreateSceneFromTemplate?.(template.templateId)} type="button">
                            Create Scene
                          </button>
                          <button onClick={() => onDeleteSceneTemplate?.(template.templateId)} type="button">
                            Delete Template
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
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
                      <button onClick={() => onSaveSceneAsTemplate?.(scene.sceneId)} type="button">
                        Save as Template
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
                onBlur={(event) => {
                  const nextSeekValue = Number(event.currentTarget.value);
                  setIsSeekEditing(false);
                  commitSeek(nextSeekValue);
                }}
                onChange={(event) => {
                  setSeekValue(Number(event.currentTarget.value));
                }}
                onKeyUp={(event) => {
                  if (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "Home" || event.key === "End") {
                    commitSeek(Number(event.currentTarget.value));
                  }
                }}
                onPointerDown={() => setIsSeekEditing(true)}
                onPointerUp={(event) => {
                  const nextSeekValue = Number(event.currentTarget.value);
                  setIsSeekEditing(false);
                  commitSeek(nextSeekValue);
                }}
                step={preview.seekControl.step}
                type="range"
                value={seekValue}
              />
            </label>
            <output>{seekValue.toFixed(1)}s</output>
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
                {sceneCharacters !== undefined && sceneCharacters.sceneId === sceneInspector.sceneId ? (
                  <section className="rss-scene-characters" aria-label="Scene characters">
                    <h3>Scene Characters</h3>
                    <label>
                      Add character
                      <select
                        aria-label="Add scene character"
                        defaultValue=""
                        disabled={sceneCharacters.availableCharacters.length === 0 || onAddSceneCharacter === undefined}
                        onChange={(event) => {
                          const characterId = event.currentTarget.value;
                          if (characterId.length > 0) {
                            onAddSceneCharacter?.({ sceneId: sceneInspector.sceneId, characterId });
                            event.currentTarget.value = "";
                          }
                        }}
                      >
                        <option value="">Select CharacterModel</option>
                        {sceneCharacters.availableCharacters.map((character) => (
                          <option key={character.characterId} value={character.characterId}>
                            {character.characterName}
                          </option>
                        ))}
                      </select>
                    </label>
                    {sceneCharacters.placedCharacters.length === 0 ? <p>No characters placed in this scene.</p> : null}
                    <ul aria-label="Placed character list">
                      {sceneCharacters.placedCharacters.map((character) => (
                        <li key={character.instanceId}>
                          <button
                            aria-pressed={sceneCharacters.selectedInstanceId === character.instanceId}
                            onClick={() => onSelectSceneCharacter?.({ sceneId: sceneInspector.sceneId, instanceId: character.instanceId })}
                            type="button"
                          >
                            {character.characterName} / {character.instanceId}
                          </button>
                          <label>
                            X
                            <input
                              aria-label={`Character X ${character.instanceId}`}
                              defaultValue={character.transform.x}
                              onBlur={(event) =>
                                onUpdateSceneCharacter?.({ sceneId: sceneInspector.sceneId, instanceId: character.instanceId, transform: { x: Number(event.currentTarget.value) } })
                              }
                              step={1}
                              type="number"
                            />
                          </label>
                          <label>
                            Y
                            <input
                              aria-label={`Character Y ${character.instanceId}`}
                              defaultValue={character.transform.y}
                              onBlur={(event) =>
                                onUpdateSceneCharacter?.({ sceneId: sceneInspector.sceneId, instanceId: character.instanceId, transform: { y: Number(event.currentTarget.value) } })
                              }
                              step={1}
                              type="number"
                            />
                          </label>
                          <button onClick={() => onRemoveSceneCharacter?.({ sceneId: sceneInspector.sceneId, instanceId: character.instanceId })} type="button">
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>
            ) : null}
            {characterInspector !== null ? (
              <div className="rss-inspector" aria-label="Character Inspector">
                <p>{characterInspector.selectedTargetLabel}</p>
                <p>{characterInspector.characterName}</p>
              </div>
            ) : null}
            {actionInspector !== null && actionInspector.actionType === "talk" ? (
              <TalkActionInspector
                action={actionInspector}
                targetOptions={sceneCharacters?.placedCharacters.map((character) => ({ instanceId: character.instanceId, characterName: character.characterName }))}
                voiceStatus={voiceStatus}
                onEditActionTimeRange={(input) =>
                  onEditActionTimeRange?.(input.sceneId, input.actionId, input.startTime, input.endTime)
                }
                onEditActionTarget={onEditActionTarget}
                onEditActionPayload={onEditActionPayload}
                onGenerateActionVoice={onGenerateActionVoice}
                onPlayActionVoice={onPlayActionVoice}
                onStopActionVoice={onStopActionVoice}
                onDeleteAction={onDeleteAction}
              />
            ) : null}
            {actionInspector !== null && actionInspector.actionType !== "talk" ? (
              <div className="rss-inspector" aria-label="Action Inspector">
                <p>{actionInspector.selectedTargetLabel}</p>
                <p>{actionInspector.actionType}</p>
                <label>
                  Target
                  <select
                    aria-label="Action target"
                    onChange={(event) =>
                      onEditActionTarget?.(
                        actionInspector.sceneId,
                        actionInspector.actionId,
                        event.currentTarget.value.length === 0 ? null : event.currentTarget.value,
                      )
                    }
                    value={actionInspector.targetId ?? ""}
                  >
                    <option value="">No target</option>
                    {(sceneCharacters?.placedCharacters ?? []).map((character) => (
                      <option key={character.instanceId} value={character.instanceId}>
                        {character.characterName}
                      </option>
                    ))}
                  </select>
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
                <button onClick={() => onDeleteAction?.(actionInspector.sceneId, actionInspector.actionId)} type="button">
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
              <label>
                Character target
                <select
                  aria-label="Timeline character target"
                  disabled={
                    timelineView.sceneId === null ||
                    placedTimelineCharacters.length === 0 ||
                    onSelectSceneCharacter === undefined
                  }
                  onChange={(event) =>
                    onSelectSceneCharacter?.({
                      sceneId: timelineView.sceneId ?? "",
                      instanceId: event.currentTarget.value.length === 0 ? null : event.currentTarget.value,
                    })
                  }
                  value={selectedTimelineCharacterId}
                >
                  <option value="">Select placed character</option>
                  {placedTimelineCharacters.map((character) => (
                    <option key={character.instanceId} value={character.instanceId}>
                      {character.characterName} / {character.instanceId}
                    </option>
                  ))}
                </select>
              </label>
              <button disabled={timelineView.sceneId === null} onClick={() => onCreateAction?.("talk")} type="button">
                Add Talk
              </button>
              <button
                disabled={timelineView.sceneId === null || selectedTimelineCharacterId.length === 0}
                onClick={() => onCreateAction?.("character")}
                type="button"
              >
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
                  {track.kind === "character-instance" ? <p>CharacterInstance: {track.characterInstanceId}</p> : null}
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

