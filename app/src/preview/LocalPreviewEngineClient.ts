import { ActionEvaluator, Scene } from "../../../core/src";
import type {
  AssetDto,
  CharacterDto,
  EngineClient,
  EngineCommandRequest,
  EngineResult,
  ExportRequest,
  ExportResult,
  PreviewRequest,
  PreviewResult,
  RenderRequest,
  RenderResult,
  VoiceRequest,
  VoiceResult,
} from "../../../shared";

type LocalPreviewEngineClientConfig = {
  commandId?: string;
};

export class LocalPreviewEngineClient implements EngineClient {
  private readonly commandId: string;

  constructor(config: LocalPreviewEngineClientConfig = {}) {
    this.commandId = config.commandId ?? "local-preview";
  }

  async execute(command: EngineCommandRequest): Promise<EngineResult> {
    return {
      commandId: command.commandId,
      ok: false,
      payload: null,
      error: `LocalPreviewEngineClient does not execute generic command: ${command.commandId}.`,
    };
  }

  async preview(request: PreviewRequest): Promise<EngineResult<PreviewResult>> {
    try {
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
      const framePath = buildPreviewSvgDataUrl({
        request,
        assets: request.assets ?? [],
        characters: request.characters ?? [],
        activeActions: evaluated.activeActions,
      });

      return {
        commandId: this.commandId,
        ok: true,
        payload: {
          framePath,
          currentTime: evaluated.currentTime,
          width: request.width,
          height: request.height,
        },
        error: null,
      };
    } catch (error) {
      return {
        commandId: this.commandId,
        ok: false,
        payload: null,
        error: error instanceof Error ? error.message : "Local preview rendering failed.",
      };
    }
  }

  async render(_request: RenderRequest): Promise<EngineResult<RenderResult>> {
    return unsupportedResult("render");
  }

  async generateVoice(_request: VoiceRequest): Promise<EngineResult<VoiceResult>> {
    return unsupportedResult("generateVoice");
  }

  async exportVideo(_request: ExportRequest): Promise<EngineResult<ExportResult>> {
    return unsupportedResult("exportVideo");
  }
}

type PreviewSvgInput = {
  request: PreviewRequest;
  assets: AssetDto[];
  characters: CharacterDto[];
  activeActions: Array<{
    actionId: string;
    actionType: string;
    targetId: string | null;
    payload: Record<string, unknown>;
    progress: number;
  }>;
};

function buildPreviewSvgDataUrl(input: PreviewSvgInput): string {
  const { request, assets, characters, activeActions } = input;
  const background = assets.find((asset) => asset.assetId === request.scene.backgroundAssetId) ?? null;
  const talkAction = activeActions.find((action) => action.actionType === "talk") ?? null;
  const moveAction = activeActions.find((action) => action.actionType === "move") ?? null;
  const flashAction = activeActions.find((action) => action.actionType === "flash") ?? null;
  const zoomAction = activeActions.find((action) => action.actionType === "camera_zoom") ?? null;
  const moveX = readNumber(moveAction?.payload.x, 0) * (moveAction?.progress ?? 0);
  const moveY = readNumber(moveAction?.payload.y, 0) * (moveAction?.progress ?? 0);
  const zoom = readNumber(zoomAction?.payload.zoom, 1);
  const flashOpacity = flashAction === null ? 0 : Math.min(0.75, Math.max(0, readNumber(flashAction.payload.intensity, 0.5)));
  const speakerName = findCharacterName(characters, talkAction?.targetId ?? null);
  const talkText = readString(talkAction?.payload.text, "");
  const safeWidth = Math.max(1, request.width);
  const safeHeight = Math.max(1, request.height);
  const centerX = safeWidth / 2;
  const characterX = centerX + moveX;
  const characterY = safeHeight * 0.58 + moveY;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${safeWidth}" height="${safeHeight}" viewBox="0 0 ${safeWidth} ${safeHeight}">
  <rect width="100%" height="100%" fill="#10131f"/>
  <rect x="24" y="24" width="${safeWidth - 48}" height="${safeHeight - 48}" rx="28" fill="#1c2233" stroke="#47506a" stroke-width="3"/>
  <text x="48" y="70" fill="#f4f7ff" font-family="monospace" font-size="28">${escapeXml(request.scene.sceneName)}</text>
  <text x="48" y="108" fill="#b8c0d8" font-family="monospace" font-size="18">${formatTime(request.currentTime)} / ${formatTime(request.scene.duration)}</text>
  <text x="48" y="146" fill="#b8c0d8" font-family="monospace" font-size="18">Background: ${escapeXml(background?.assetName ?? "none")}</text>
  <text x="48" y="174" fill="#8791b0" font-family="monospace" font-size="14">${escapeXml(background?.assetPath ?? "No background asset selected")}</text>
  <g transform="translate(${characterX} ${characterY}) scale(${zoom})">
    <circle cx="0" cy="-82" r="76" fill="#67d391" stroke="#f4f7ff" stroke-width="4"/>
    <rect x="-92" y="-8" width="184" height="160" rx="34" fill="#8be7aa" stroke="#f4f7ff" stroke-width="4"/>
    <circle cx="-28" cy="-96" r="8" fill="#10131f"/>
    <circle cx="28" cy="-96" r="8" fill="#10131f"/>
    <rect x="-30" y="-66" width="60" height="12" rx="6" fill="#10131f" opacity="${talkAction === null ? 0.35 : 1}"/>
    <text x="0" y="188" text-anchor="middle" fill="#f4f7ff" font-family="monospace" font-size="18">${escapeXml(speakerName)}</text>
  </g>
  <rect x="60" y="${safeHeight - 156}" width="${safeWidth - 120}" height="96" rx="18" fill="#0d1020" stroke="#f4f7ff" stroke-width="2" opacity="${talkAction === null ? 0.2 : 0.94}"/>
  <text x="92" y="${safeHeight - 100}" fill="#f4f7ff" font-family="monospace" font-size="26">${escapeXml(talkText || "No active talk action")}</text>
  <text x="48" y="${safeHeight - 28}" fill="#b8c0d8" font-family="monospace" font-size="16">Active actions: ${escapeXml(activeActions.map((action) => action.actionType).join(", ") || "none")}</text>
  <rect width="100%" height="100%" fill="#ffffff" opacity="${flashOpacity}"/>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function toActionPayloadRecord(payload: Record<string, unknown>): Record<string, string | number | boolean | null | Array<string | number | boolean | null> | { [key: string]: string | number | boolean | null }> {
  return JSON.parse(JSON.stringify(payload)) as Record<string, string | number | boolean | null | Array<string | number | boolean | null> | { [key: string]: string | number | boolean | null }>;
}

function unsupportedResult<TPayload>(commandName: string): EngineResult<TPayload> {
  return {
    commandId: "local-preview",
    ok: false,
    payload: null,
    error: `LocalPreviewEngineClient does not support ${commandName}.`,
  };
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function findCharacterName(characters: CharacterDto[], characterId: string | null): string {
  if (characterId === null) {
    return "Character";
  }

  return characters.find((character) => character.characterId === characterId)?.characterName ?? characterId;
}

function formatTime(time: number): string {
  return `${time.toFixed(1)}s`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
