import { HtmlAudioPreviewController } from "../preview";
import { HtmlVoicePreviewPlayer } from "../voice";
import { BackendProjectFolderFileStore } from "./BackendProjectFolderFileStore";
import { ProjectSession } from "./ProjectSession";
import { VoicePreviewController } from "./VoicePreviewController";

export type StudioCompositionRoot = {
  projectSession: ProjectSession;
  voicePreviewController: VoicePreviewController;
  previewAudioController: HtmlAudioPreviewController;
  projectFolderFileStore: BackendProjectFolderFileStore;
};

export function createStudioCompositionRoot(): StudioCompositionRoot {
  let projectSession: ProjectSession | null = null;
  const projectFolderFileStore = new BackendProjectFolderFileStore({
    getProjectId: () => projectSession?.project.toSnapshot().projectId ?? "project-local-preview",
  });
  projectSession = new ProjectSession({ assetFileStore: projectFolderFileStore });
  const previewAudioController = new HtmlAudioPreviewController();

  return {
    projectSession,
    previewAudioController,
    projectFolderFileStore,
    voicePreviewController: new VoicePreviewController({
      generateVoiceUseCase: projectSession.useCases.generateVoice,
      player: new HtmlVoicePreviewPlayer(),
      persistProject: () => projectSession.persist(),
    }),
  };
}
