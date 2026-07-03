import { CryptoRandomIdGenerator, Project } from "../../../core/src";
import { SavePixelDocumentUseCase, type SavePixelDocumentInput } from "../../../app/src";
import { ProjectJsonSerializer } from "../../../storage/src/local/ProjectJsonSerializer";
import { projectSnapshotToProjectDto } from "../react/ProjectDtoMapper";
import { BackendProjectFolderFileStore } from "../react/BackendProjectFolderFileStore";
import { loadBrowserProjectById, saveBrowserProject } from "../react/BrowserProjectPersistence";

export type PixelEditorProjectSaveAdapterInput = {
  projectId: string;
  projectName: string;
};

export type PixelEditorProjectSaveAdapterResult = {
  assetName: string;
  assetPath: string;
};

export async function savePixelDocumentToProject(
  context: PixelEditorProjectSaveAdapterInput,
  input: SavePixelDocumentInput,
): Promise<PixelEditorProjectSaveAdapterResult> {
  const project = loadBrowserProjectById(context.projectId) ??
    Project.create({ projectId: context.projectId, projectName: context.projectName });
  const fileStore = new BackendProjectFolderFileStore({ getProjectId: () => context.projectId });
  const useCase = new SavePixelDocumentUseCase({
    project,
    idGenerator: new CryptoRandomIdGenerator(),
    fileStore,
  });

  const result = await useCase.save(input);
  saveBrowserProject(project);

  const serializer = new ProjectJsonSerializer();
  await fileStore.writeProjectJson(serializer.serialize(projectSnapshotToProjectDto(project.toSnapshot())));
  notifyStudioPixelAssetSaved(context.projectId);

  return {
    assetName: result.asset.assetName,
    assetPath: result.asset.assetPath,
  };
}

function notifyStudioPixelAssetSaved(projectId: string): void {
  const message = {
    type: "retro-short-studio.pixel-asset-saved",
    projectId,
  };

  if (typeof window === "undefined") {
    return;
  }

  window.opener?.postMessage(message, window.location.origin);
}
