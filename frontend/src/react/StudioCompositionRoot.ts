import { HtmlVoicePreviewPlayer } from "../voice";
import { ProjectSession } from "./ProjectSession";
import { VoicePreviewController } from "./VoicePreviewController";

export type StudioCompositionRoot = {
  projectSession: ProjectSession;
  voicePreviewController: VoicePreviewController;
};

export function createStudioCompositionRoot(): StudioCompositionRoot {
  const projectSession = new ProjectSession();

  return {
    projectSession,
    voicePreviewController: new VoicePreviewController({
      generateVoiceUseCase: projectSession.useCases.generateVoice,
      player: new HtmlVoicePreviewPlayer(),
      persistProject: () => projectSession.persist(),
    }),
  };
}
