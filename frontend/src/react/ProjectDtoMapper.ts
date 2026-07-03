import type { ProjectSnapshot } from "../../../core/src";
import {
  CURRENT_PROJECT_SCHEMA_VERSION,
  type ActionDto,
  type ActionTypeDto,
  type AssetDto,
  type AssetTypeDto,
  type ProjectDto,
} from "../../../shared";

const SUPPORTED_ASSET_TYPES = new Set<AssetTypeDto>([
  "background",
  "character_image",
  "voice",
  "bgm",
  "se",
  "effect",
]);

const SUPPORTED_ACTION_TYPES = new Set<ActionTypeDto>([
  "talk",
  "move",
  "fade",
  "flash",
  "camera_move",
  "camera_zoom",
  "custom",
]);

export function projectSnapshotToProjectDto(snapshot: ProjectSnapshot): ProjectDto {
  return {
    schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
    projectId: snapshot.projectId,
    projectName: snapshot.projectName,
    settings: snapshot.settings,
    assets: snapshot.assets.map((asset): AssetDto => ({
      assetId: asset.assetId,
      assetName: asset.assetName,
      assetType: normalizeAssetType(asset.assetType),
      assetPath: asset.assetPath,
    })),
    characters: snapshot.characters.map((character) => ({
      characterId: character.characterId,
      characterName: character.characterName,
      defaultExpression: character.defaultExpression,
      defaultEye: character.defaultEye,
      defaultMouth: character.defaultMouth,
      defaultMotion: character.defaultMotion,
      imageMap: character.imageMap ?? { expression: {}, eye: {}, mouth: {}, motion: {} },
      ...(character.currentVariant === undefined ? {} : { currentVariant: character.currentVariant }),
      imageMapId: character.imageMap === undefined ? null : character.characterId,
    })),
    scenes: snapshot.scenes.map((scene) => ({
      sceneId: scene.sceneId,
      sceneName: scene.sceneName,
      duration: scene.duration,
      backgroundAssetId: scene.backgroundAssetId,
      characterIds: scene.characters.map((character) => character.characterId),
      characters: scene.characters.map((character) => ({ ...character, transform: { ...character.transform } })),
      actions: scene.actions.map((action): ActionDto => ({
        actionId: action.actionId,
        actionType: normalizeActionType(action.actionType),
        startTime: action.startTime,
        endTime: action.endTime,
        targetId: action.targetId,
        payload: action.payload,
      })),
    })),
  };
}

function normalizeAssetType(assetType: string): AssetTypeDto {
  return SUPPORTED_ASSET_TYPES.has(assetType as AssetTypeDto) ? (assetType as AssetTypeDto) : "effect";
}

function normalizeActionType(actionType: string): ActionTypeDto {
  return SUPPORTED_ACTION_TYPES.has(actionType as ActionTypeDto) ? (actionType as ActionTypeDto) : "custom";
}
