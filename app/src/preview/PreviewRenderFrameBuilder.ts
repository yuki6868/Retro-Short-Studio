import { ActionEvaluator, Scene } from "../../../core/src";
import type { AssetDto, CharacterDto, PreviewRequest } from "../../../shared";

export type PreviewDrawablePayload = {
  assetId: string;
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
    const moveX = readNumber(moveAction?.payload.x, 0) * (moveAction?.progress ?? 0);
    const moveY = readNumber(moveAction?.payload.y, 0) * (moveAction?.progress ?? 0);
    const zoom = readNumber(zoomAction?.payload.zoom, 1);
    const characterAsset = findFirstCharacterAsset(assets);
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
              path: backgroundAsset.assetPath,
              x: 0,
              y: 0,
              width: request.width,
              height: request.height,
              imageBank: 0,
              zIndex: -10_000,
            },
          }),
      characters: characterIds.map((characterId, index) => ({
        assetId: characterAsset?.assetId ?? characterId,
        path: characterAsset?.assetPath ?? "assets/characters/placeholder.png",
        x: Math.round(request.width / 2 - 96 + moveX + index * 24),
        y: Math.round(request.height * 0.42 + moveY),
        width: 192,
        height: 192,
        imageBank: index + 1,
        zIndex: index,
        scale: zoom,
        transparentColor: 0,
      })),
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

function findAsset(assets: AssetDto[], assetId: string | null): AssetDto | null {
  if (assetId === null) {
    return null;
  }

  return assets.find((asset) => asset.assetId === assetId) ?? null;
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
