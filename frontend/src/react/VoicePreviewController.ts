import type {
  AssetLibraryUseCase,
  AssetLibraryState,
  GenerateVoiceUseCase,
  InspectorState,
  InspectorUseCase,
  TimelineState,
  TimelineUseCase,
} from "../../../app/src";
import type { VoicePreviewPlayer } from "../voice";

export type GenerateSelectedActionVoiceInput = {
  sceneId: string;
  actionId: string;
  assetLibrary: AssetLibraryUseCase;
  inspector: InspectorUseCase;
  timeline: TimelineUseCase;
  setAssetState(state: AssetLibraryState): void;
  setInspectorState(state: InspectorState): void;
  setTimelineState(state: TimelineState): void;
  setStatus(status: string | null): void;
};

export type VoicePreviewControllerConfig = {
  generateVoiceUseCase: GenerateVoiceUseCase;
  player: VoicePreviewPlayer;
  persistProject?: () => void;
};

export class VoicePreviewController {
  constructor(private readonly config: VoicePreviewControllerConfig) {}

  async generateSelectedActionVoice(input: GenerateSelectedActionVoiceInput): Promise<InspectorState> {
    input.setStatus("Generating voice...");

    try {
      const result = await this.config.generateVoiceUseCase.generateForTalkAction({
        sceneId: input.sceneId,
        actionId: input.actionId,
      });
      input.setAssetState(input.assetLibrary.state);
      const nextInspectorState = input.inspector.selectAction(input.sceneId, input.actionId);
      input.setInspectorState(nextInspectorState);
      input.setTimelineState(input.timeline.showScene(input.sceneId));
      this.config.persistProject?.();
      input.setStatus(`Generated voice: ${result.voiceAssetPath}`);
      return nextInspectorState;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Voice generation failed.";
      input.setStatus(message);
      throw error;
    }
  }

  async playSelectedActionVoice(voiceAssetPath: string, setStatus: (status: string | null) => void): Promise<void> {
    try {
      await this.config.player.play(voiceAssetPath);
      setStatus("Playing voice.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Voice preview failed.";
      setStatus(message);
      throw error;
    }
  }

  stopSelectedActionVoice(setStatus: (status: string | null) => void): void {
    this.config.player.stop();
    setStatus("Stopped voice.");
  }
}
