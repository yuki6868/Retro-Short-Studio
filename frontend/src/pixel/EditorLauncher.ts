export type PixelEditorLaunchInput = {
  projectId: string;
  projectName: string;
};

export type PixelEditorLaunchResult = {
  opened: boolean;
  target: string;
  url: string;
};

export type WindowOpenPort = Pick<Window, "open">;

const PIXEL_EDITOR_WINDOW_TARGET = "retro-short-studio-pixel-editor";
const PIXEL_EDITOR_WINDOW_FEATURES = "popup=yes,width=980,height=760,resizable=yes,scrollbars=yes";

export class EditorLauncher {
  constructor(private readonly windowPort: WindowOpenPort | null = typeof window === "undefined" ? null : window) {}

  openPixelEditor(input: PixelEditorLaunchInput): PixelEditorLaunchResult {
    const url = this.createPixelEditorUrl(input);
    const openedWindow = this.windowPort?.open(url, PIXEL_EDITOR_WINDOW_TARGET, PIXEL_EDITOR_WINDOW_FEATURES) ?? null;
    openedWindow?.focus?.();

    return {
      opened: openedWindow !== null,
      target: PIXEL_EDITOR_WINDOW_TARGET,
      url,
    };
  }

  createPixelEditorUrl(input: PixelEditorLaunchInput): string {
    const params = new URLSearchParams({
      projectId: input.projectId,
      projectName: input.projectName,
    });

    return `${this.resolveBaseUrl()}#pixel-editor?${params.toString()}`;
  }

  private resolveBaseUrl(): string {
    if (typeof window === "undefined") {
      return "/";
    }

    return window.location.href.split("#")[0];
  }
}
