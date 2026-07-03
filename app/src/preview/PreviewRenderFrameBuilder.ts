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
    const moveAction = evaluated.activeActions.find((action) => action.actionType === "move") ?? null;
    const zoomAction = evaluated.activeActions.find((action) => action.actionType === "camera_zoom") ?? null;
    const talkAction = evaluated.activeActions.find((action) => action.actionType === "talk") ?? null;
    const characterAnimationController = new CharacterAnimationController();
    const moveX = readNumber(moveAction?.payload.x, 0) * (moveAction?.progress ?? 0);
    const moveY = readNumber(moveAction?.payload.y, 0) * (moveAction?.progress ?? 0);
    const zoom = readNumber(zoomAction?.payload.zoom, 1);
    const characterIds = request.scene.characterIds.length > 0 ? request.scene.characterIds : fallbackCharacterIds(characters, talkAction?.targetId ?? null);

    return {
      width: request.width,
      height: request.height,
      currentTime: evaluated.currentTime,
      clearColor: 1,
      ...(backgroundAsset === null
        ? {}
        : {
            background: {
              assetId: backgroundAsset.assetId,
              assetName: backgroundAsset.assetName,
              path: toProjectAssetPath(request.projectId, backgroundAsset.assetPath),
              x: 0,
              y: 0,
              width: request.width,
              height: request.height,
              imageBank: 0,
              zIndex: -10_000,
            },
          }),
      characters: characterIds.map((characterId, index) => {
        const character = characters.find((candidate) => candidate.characterId === characterId) ?? null;
        const characterAsset = resolveCharacterAsset({
          assets,
          character,
          currentTime: evaluated.currentTime,
          talkAction: talkAction?.targetId === characterId ? { startTime: talkAction.startTime, endTime: talkAction.endTime } : null,
          animationController: characterAnimationController,
        }) ?? findFirstCharacterAsset(assets);

        return {
          assetId: characterAsset?.assetId ?? characterId,
          assetName: characterAsset?.assetName ?? character?.characterName ?? characterId,
          path: toProjectAssetPath(request.projectId, characterAsset?.assetPath ?? "assets/characters/placeholder.png"),
          x: Math.round(request.width / 2 - 96 + moveX + index * 24),
          y: Math.round(request.height * 0.42 + moveY),
          width: 192,
          height: 192,
          imageBank: index + 1,
          zIndex: index,
          scale: zoom,
          transparentColor: 0,
        };
      }),
      textOverlays: buildTextOverlays(request, characters, talkAction?.targetId ?? null, readString(talkAction?.payload.text, "")),
      activeActionTypes: evaluated.activeActions.map((action) => action.actionType),
    };
  }
}

function buildTextOverlays(request: PreviewRequest, characters: CharacterDto[], speakerId: string | null, talkText: string): PreviewTextOverlayPayload[] {
  const speakerName = findCharacterName(characters, speakerId);
  const overlays: PreviewTextOverlayPayload[] = [
    { text: request.scene.sceneName, x: 16, y: 16, color: 7 },
    { text: `${request.currentTime.toFixed(1)}s`, x: 16, y: 32, color: 6 },
  ];

  if (talkText.trim().length > 0) {
    overlays.push({ text: `${speakerName}: ${talkText}`, x: 16, y: request.height - 32, color: 7 });
  }

  return overlays;
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
  talkAction: { startTime: number; endTime: number } | null;
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

