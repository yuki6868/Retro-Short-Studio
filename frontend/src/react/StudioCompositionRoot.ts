import { HtmlAudioPreviewController } from "../preview";
import { HtmlVoicePreviewPlayer } from "../voice";
import { ProjectSession } from "./ProjectSession";
import { VoicePreviewController } from "./VoicePreviewController";

export type StudioCompositionRoot = {
  projectSession: ProjectSession;
  voicePreviewController: VoicePreviewController;
  previewAudioController: HtmlAudioPreviewController;
};

export function createStudioCompositionRoot(): StudioCompositionRoot {
  const projectSession = new ProjectSession();
  const previewAudioController = new HtmlAudioPreviewController();

  return {
    projectSession,
    previewAudioController,
    voicePreviewController: new VoicePreviewController({
      generateVoiceUseCase: projectSession.useCases.generateVoice,
      player: new HtmlVoicePreviewPlayer(),
      persistProject: () => projectSession.persist(),
    }),
  };
}
