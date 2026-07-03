import type {
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
import { DefaultPreviewRenderFrameBuilder, type PreviewDrawablePayload, type PreviewRenderFrameBuilder, type PreviewRenderFramePayload } from "./PreviewRenderFrameBuilder";

type LocalPreviewEngineClientConfig = {
  commandId?: string;
  frameBuilder?: PreviewRenderFrameBuilder;
};

export class LocalPreviewEngineClient implements EngineClient {
  private readonly commandId: string;
  private readonly frameBuilder: PreviewRenderFrameBuilder;

  constructor(config: LocalPreviewEngineClientConfig = {}) {
    this.commandId = config.commandId ?? "local-preview";
    this.frameBuilder = config.frameBuilder ?? new DefaultPreviewRenderFrameBuilder();
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
      const frame = this.frameBuilder.build(request);
      const framePath = buildPreviewSvgDataUrl(frame, request.scene.duration);

      return {
        commandId: this.commandId,
        ok: true,
        payload: {
          framePath,
          currentTime: frame.currentTime,
          width: frame.width,
          height: frame.height,
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

function buildPreviewSvgDataUrl(frame: PreviewRenderFramePayload, duration: number): string {
  const safeWidth = Math.max(1, frame.width);
  const safeHeight = Math.max(1, frame.height);
  const backgroundName = frame.background?.assetName ?? frame.background?.assetId ?? "none";
  const backgroundPath = frame.background?.path ?? "No background asset selected";
  const firstTalkOverlay = frame.textOverlays.find((overlay) => !overlay.text.endsWith("s") && overlay.y >= safeHeight - 64) ?? null;
  const talkText = firstTalkOverlay?.text ?? "No active talk action";
  const effectOverlays = frame.effects.map(renderSvgEffect).join("\n  ");

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${safeWidth}" height="${safeHeight}" viewBox="0 0 ${safeWidth} ${safeHeight}">
  <rect width="100%" height="100%" fill="${toSvgColor(frame.clearColor)}"/>
  ${frame.background === undefined ? "" : renderSvgImage(frame.background)}
  <rect x="24" y="24" width="${safeWidth - 48}" height="${safeHeight - 48}" rx="28" fill="#1c2233" stroke="#47506a" stroke-width="3" opacity="0.82"/>
  ${frame.textOverlays.map((overlay) => `<text x="${overlay.x}" y="${overlay.y}" fill="${toSvgColor(overlay.color ?? 7)}" font-family="monospace" font-size="${overlay.y <= 32 ? 18 : 28}">${escapeXml(overlay.text)}</text>`).join("\n  ")}
  <text x="48" y="108" fill="#b8c0d8" font-family="monospace" font-size="18">${formatTime(frame.currentTime)} / ${formatTime(duration)}</text>
  <text x="48" y="146" fill="#b8c0d8" font-family="monospace" font-size="18">Background: ${escapeXml(backgroundName)}</text>
  <text x="48" y="174" fill="#8791b0" font-family="monospace" font-size="14">${escapeXml(backgroundPath)}</text>
  ${frame.characters.map((character) => renderSvgCharacter(character)).join("\n  ")}
  <rect x="60" y="${safeHeight - 156}" width="${safeWidth - 120}" height="96" rx="18" fill="#0d1020" stroke="#f4f7ff" stroke-width="2" opacity="${talkText === "No active talk action" ? 0.2 : 0.94}"/>
  <text x="92" y="${safeHeight - 100}" fill="#f4f7ff" font-family="monospace" font-size="26">${escapeXml(talkText)}</text>
  <text x="48" y="${safeHeight - 28}" fill="#b8c0d8" font-family="monospace" font-size="16">Active actions: ${escapeXml(frame.activeActionTypes.join(", ") || "none")}</text>
  ${effectOverlays}
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function renderSvgEffect(effect: PreviewRenderFramePayload["effects"][number]): string {
  const fill = effect.effectType === "flash" ? "#ffffff" : "#000000";
  const opacity = Math.min(Math.max(effect.alpha, 0), 1);
  return `<rect width="100%" height="100%" fill="${fill}" opacity="${opacity}" data-effect-type="${effect.effectType}"/>`;
}

function renderSvgImage(drawable: PreviewDrawablePayload): string {
  return `<image href="${escapeXml(drawable.path)}" x="${drawable.x}" y="${drawable.y}" width="${drawable.width}" height="${drawable.height}" preserveAspectRatio="xMidYMid slice"/>`;
}

function renderSvgCharacter(character: PreviewDrawablePayload): string {
  const scale = character.scale ?? 1;
  const centerX = character.x + character.width / 2;
  const centerY = character.y + character.height / 2;
  const transform = `translate(${centerX} ${centerY}) rotate(${character.rotation ?? 0}) scale(${scale}) translate(${-character.width / 2} ${-character.height / 2})`;

  return `
  <g transform="${transform}" data-asset-id="${escapeXml(character.assetId)}">
    <image href="${escapeXml(character.path)}" x="0" y="0" width="${character.width}" height="${character.height}" preserveAspectRatio="xMidYMid meet"/>
    <rect x="0" y="0" width="${character.width}" height="${character.height}" fill="none" stroke="#f4f7ff" stroke-width="2" opacity="0.3"/>
  </g>`;
}

function unsupportedResult<TPayload>(commandName: string): EngineResult<TPayload> {
  return {
    commandId: "local-preview",
    ok: false,
    payload: null,
    error: `LocalPreviewEngineClient does not support ${commandName}.`,
  };
}

function formatTime(time: number): string {
  return `${time.toFixed(1)}s`;
}

function toSvgColor(color: number): string {
  const palette: Record<number, string> = {
    0: "#000000",
    1: "#10131f",
    6: "#b8c0d8",
    7: "#f4f7ff",
  };

  return palette[color] ?? "#f4f7ff";
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
