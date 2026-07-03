import { ActionEvaluator, CharacterAnimationController, CharacterImageMap, Scene, type CharacterVariantSelectionSnapshot } from "../../../core/src";
import type { AssetDto, CharacterDto, PreviewRequest } from "../../../shared";

export type PreviewDrawablePayload = {
  assetId: string;
  assetName?: string;
  path: string;
  x: number;
  y: number;
  width: number;
  height: number;
  imageBank: number;
  zIndex: number;
  scale?: number;
  rotation?: number;
  transparentColor?: number | null;
};

export type PreviewTextOverlayPayload = {
  text: string;
  x: number;
  y: number;
  color?: number;
};

export type PreviewRenderFramePayload = {
  width: number;
  height: number;
  currentTime: number;
  clearColor: number;
  background?: PreviewDrawablePayload;
  characters: PreviewDrawablePayload[];
  textOverlays: PreviewTextOverlayPayload[];
  activeActionTypes: string[];
};

export interface PreviewRenderFrameBuilder {
  build(request: PreviewRequest): PreviewRenderFramePayload;
}

export class DefaultPreviewRenderFrameBuilder implements PreviewRenderFrameBuilder {
  build(request: PreviewRequest): PreviewRenderFramePayload {
    const scene = Scene.create({
      sceneId: request.scene.sceneId,
      sceneName: request.scene.sceneName,
      duration: request.scene.duration,
      backgroundAssetId: request.scene.backgroundAssetId,
      actions: request.scene.actions.map((action) => ({
        ...action,
        payload: toActionPayloadRecord(action.payload),
      })),
    });
    const evaluated = new ActionEvaluator().evaluate(scene, request.currentTime);
    const assets = request.assets ?? [];
    const characters = request.characters ?? [];
    const backgroundAsset = findAsset(assets, request.scene.backgroundAssetId);
    const backgroundPlaceholder = backgroundAsset === null ? resolveBackgroundPlaceholder(request.scene.backgroundAssetId) : null;
    const moveAction = evaluated.activeActions.find((action) => action.actionType === "move") ?? null;
    const zoomAction = evaluated.activeActions.find((action) => action.actionType === "camera_zoom") ?? null;
    const talkAction = evaluated.activeActions.find((action) => action.actionType === "talk") ?? null;
    const characterAnimationController = new CharacterAnimationController();
    const moveX = readNumber(moveAction?.payload.x, 0) * (moveAction?.progress ?? 0);
    const moveY = readNumber(moveAction?.payload.y, 0) * (moveAction?.progress ?? 0);
    const zoom = readNumber(zoomAction?.payload.zoom, 1);
    const characterInstances = resolveCharacterInstances({
      sceneCharacters: request.scene.characters,
      characterIds: request.scene.characterIds,
      characters,
      targetId: talkAction?.targetId ?? null,
    });

    return {
      width: request.width,
      height: request.height,
      currentTime: evaluated.currentTime,
      clearColor: 1,
      background: {
        assetId: backgroundAsset?.assetId ?? "preview-background-placeholder",
        assetName: backgroundAsset?.assetName ?? backgroundPlaceholder?.label ?? "No background asset selected",
        path: backgroundAsset === null ? "assets/placeholders/background-missing.png" : toProjectAssetPath(request.projectId, backgroundAsset.assetPath),
        x: 0,
        y: 0,
        width: request.width,
        height: request.height,
        imageBank: 0,
        zIndex: -10_000,
      },
      characters: characterInstances.map((characterInstance, index) => {
        const character = characters.find((candidate) => candidate.characterId === characterInstance.characterId) ?? null;
        const characterAsset = resolveCharacterAsset({
          assets,
          character,
          currentTime: evaluated.currentTime,
          talkAction: talkAction?.targetId === characterInstance.instanceId || talkAction?.targetId === characterInstance.characterId ? { startTime: talkAction.startTime, endTime: talkAction.endTime, mouthCues: readMouthCues(talkAction.payload.mouthCues) } : null,
          autoMotions: readAutoMotions(character?.autoMotions),
          animationController: characterAnimationController,
        }) ?? findFirstCharacterAsset(assets);
        const characterPlaceholder = characterAsset === null ? resolveCharacterPlaceholder(characterInstance.characterId, character) : null;

        return {
          assetId: characterAsset?.assetId ?? `preview-character-placeholder:${characterInstance.instanceId}`,
          assetName: characterAsset?.assetName ?? characterPlaceholder?.label ?? character?.characterName ?? characterInstance.characterId,
          path: characterAsset === null ? "assets/placeholders/character-missing.png" : toProjectAssetPath(request.projectId, characterAsset.assetPath),
          x: Math.round(request.width / 2 - 96 + characterInstance.transform.x + moveX + index * 24),
          y: Math.round(request.height * 0.42 + characterInstance.transform.y + moveY),
          width: 192,
          height: 192,
          imageBank: index + 1,
          zIndex: index,
          scale: zoom * characterInstance.transform.scale,
          rotation: characterInstance.transform.rotation,
          transparentColor: 0,
        };
      }),
      textOverlays: buildTextOverlays({
        request,
        characters,
        speakerId: talkAction?.targetId ?? null,
        talkText: readString(talkAction?.payload.text, ""),
        backgroundPlaceholder,
        missingCharacterIds: characterInstances.filter((characterInstance) => {
          const character = characters.find((candidate) => candidate.characterId === characterInstance.characterId) ?? null;
          return resolveCharacterAsset({
            assets,
            character,
            currentTime: evaluated.currentTime,
            talkAction: talkAction?.targetId === characterInstance.instanceId || talkAction?.targetId === characterInstance.characterId ? { startTime: talkAction.startTime, endTime: talkAction.endTime, mouthCues: readMouthCues(talkAction.payload.mouthCues) } : null,
            autoMotions: readAutoMotions(character?.autoMotions),
            animationController: characterAnimationController,
          }) === null && findFirstCharacterAsset(assets) === null;
        }).map((characterInstance) => characterInstance.instanceId),
      }),
      activeActionTypes: evaluated.activeActions.map((action) => action.actionType),
    };
  }
}

type PreviewCharacterInstance = {
  instanceId: string;
  characterId: string;
  transform: { x: number; y: number; scale: number; rotation: number };
};

function resolveCharacterInstances(input: {
  sceneCharacters: import("../../../shared").CharacterInstanceDto[] | undefined;
  characterIds: string[];
  characters: CharacterDto[];
  targetId: string | null;
}): PreviewCharacterInstance[] {
  if (input.sceneCharacters !== undefined && input.sceneCharacters.length > 0) {
    return input.sceneCharacters.map((character) => ({
      instanceId: character.instanceId,
      characterId: character.characterId,
      transform: character.transform,
    }));
  }

  const characterIds = input.characterIds.length > 0 ? input.characterIds : fallbackCharacterIds(input.characters, input.targetId);

  return characterIds.map((characterId) => ({
    instanceId: characterId,
    characterId,
    transform: { x: 0, y: 0, scale: 1, rotation: 0 },
  }));
}

type PreviewPlaceholder = {
  label: string;
  reason: string;
};

type BuildTextOverlaysInput = {
  request: PreviewRequest;
  characters: CharacterDto[];
  speakerId: string | null;
  talkText: string;
  backgroundPlaceholder: PreviewPlaceholder | null;
  missingCharacterIds: string[];
};

function buildTextOverlays(input: BuildTextOverlaysInput): PreviewTextOverlayPayload[] {
  const speakerName = findCharacterName(input.characters, input.speakerId);
  const overlays: PreviewTextOverlayPayload[] = [
    { text: input.request.scene.sceneName, x: 16, y: 16, color: 7 },
    { text: `${input.request.currentTime.toFixed(1)}s`, x: 16, y: 32, color: 6 },
  ];

  if (input.backgroundPlaceholder !== null) {
    overlays.push({ text: `Preview placeholder: ${input.backgroundPlaceholder.reason}`, x: 48, y: 64, color: 10 });
  }

  input.missingCharacterIds.forEach((characterId, index) => {
    overlays.push({ text: `Character placeholder: ${characterId} has no character_image asset`, x: 48, y: 88 + index * 24, color: 10 });
  });

  if (input.talkText.trim().length > 0) {
    overlays.push({ text: `${speakerName}: ${input.talkText}`, x: 16, y: input.request.height - 32, color: 7 });
  }

  return overlays;
}

function resolveBackgroundPlaceholder(backgroundAssetId: string | null): PreviewPlaceholder {
  return backgroundAssetId === null
    ? { label: "No background asset selected", reason: "Scene background is not set" }
    : { label: "Missing background asset", reason: `Background asset ${backgroundAssetId} was not found` };
}

function resolveCharacterPlaceholder(characterId: string, character: CharacterDto | null): PreviewPlaceholder {
  if (character === null) {
    return { label: "Missing character", reason: `Character ${characterId} was not found in Project.characters` };
  }

  return { label: "Missing character image", reason: `Character ${character.characterName} has no resolved character_image asset` };
}

function toProjectAssetPath(projectId: string, assetPath: string): string {
  const normalizedAssetPath = assetPath.replace(/\\/g, "/").replace(/^\/+/, "");

  if (normalizedAssetPath.startsWith("projects/")) {
    return normalizedAssetPath;
  }

  const normalizedProjectId = projectId.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");

  if (normalizedProjectId.length === 0 || normalizedProjectId.includes("/") || normalizedProjectId === "." || normalizedProjectId === "..") {
    throw new Error("Preview projectId must be a single project folder name.");
  }

  return `projects/${normalizedProjectId}/${normalizedAssetPath}`;
}

function findAsset(assets: AssetDto[], assetId: string | null): AssetDto | null {
  if (assetId === null) {
    return null;
  }

  return assets.find((asset) => asset.assetId === assetId) ?? null;
}


type ResolveCharacterAssetInput = {
  assets: AssetDto[];
  character: CharacterDto | null;
  currentTime: number;
  talkAction: { startTime: number; endTime: number; mouthCues?: import("../../../core/src").MouthCueSnapshot[] } | null;
  autoMotions?: import("../../../core/src").AutoMotionSnapshot[];
  animationController: CharacterAnimationController;
};

function resolveCharacterAsset(input: ResolveCharacterAssetInput): AssetDto | null {
  if (input.character === null) {
    return null;
  }

  const imageMap = CharacterImageMap.create(input.character.imageMap ?? { expression: {}, eye: {}, mouth: {}, motion: {} });
  const baseSelection = resolveBaseVariantSelection(input.character);
  const selection = input.animationController.resolve({
    baseSelection,
    currentTime: input.currentTime,
    talk: input.talkAction,
    autoMotions: input.autoMotions,
  });

  const assetId = imageMap.findAsset({
    selection,
    motion: input.character.defaultMotion ?? "idle",
  });

  if (assetId === null) {
    return null;
  }

  return input.assets.find((asset) => asset.assetId === assetId && asset.assetType === "character_image") ?? null;
}

function resolveBaseVariantSelection(character: CharacterDto): CharacterVariantSelectionSnapshot {
  return character.currentVariant ?? {
    expression: character.defaultExpression ?? "neutral",
    eye: character.defaultEye ?? "open",
    mouth: character.defaultMouth ?? "closed",
  };
}

function findFirstCharacterAsset(assets: AssetDto[]): AssetDto | null {
  return assets.find((asset) => asset.assetType === "character_image") ?? null;
}

function fallbackCharacterIds(characters: CharacterDto[], targetId: string | null): string[] {
  if (targetId !== null) {
    return [targetId];
  }

  return characters[0] === undefined ? ["preview-character"] : [characters[0].characterId];
}

function findCharacterName(characters: CharacterDto[], characterId: string | null): string {
  if (characterId === null) {
    return "Character";
  }

  return characters.find((character) => character.characterId === characterId)?.characterName ?? characterId;
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function toActionPayloadRecord(payload: Record<string, unknown>): Record<string, string | number | boolean | null | Array<string | number | boolean | null> | { [key: string]: string | number | boolean | null }> {
  return JSON.parse(JSON.stringify(payload)) as Record<string, string | number | boolean | null | Array<string | number | boolean | null> | { [key: string]: string | number | boolean | null }>;
}



function readMouthCues(value: unknown): import("../../../core/src").MouthCueSnapshot[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const cues = value.filter((cue): cue is import("../../../core/src").MouthCueSnapshot => {
    if (typeof cue !== "object" || cue === null || Array.isArray(cue)) {
      return false;
    }

    const candidate = cue as Record<string, unknown>;
    return (
      typeof candidate.startTime === "number" &&
      Number.isFinite(candidate.startTime) &&
      candidate.startTime >= 0 &&
      typeof candidate.endTime === "number" &&
      Number.isFinite(candidate.endTime) &&
      candidate.endTime >= candidate.startTime &&
      typeof candidate.mouth === "string" &&
      candidate.mouth.trim().length > 0
    );
  });

  return cues;
}


function readAutoMotions(value: unknown): import("../../../core/src").AutoMotionSnapshot[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const motions = value.filter((motion): motion is import("../../../core/src").AutoMotionSnapshot => {
    if (typeof motion !== "object" || motion === null || Array.isArray(motion)) {
      return false;
    }

    const candidate = motion as Record<string, unknown>;
    return (
      candidate.type === "blink" &&
      typeof candidate.interval === "number" &&
      Number.isFinite(candidate.interval) &&
      candidate.interval > 0 &&
      typeof candidate.duration === "number" &&
      Number.isFinite(candidate.duration) &&
      candidate.duration > 0 &&
      (candidate.randomRange === undefined || (typeof candidate.randomRange === "number" && Number.isFinite(candidate.randomRange) && candidate.randomRange >= 0))
    );
  });

  return motions;
}
