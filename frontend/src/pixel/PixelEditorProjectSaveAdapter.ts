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
  assetId: string;
  assetName: string;
  assetPath: string;
  assignedCharacterImageMap?: SavePixelDocumentInput["assignToCharacterImageMap"];
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
  notifyStudioPixelAssetSaved(context.projectId, {
    assetId: result.asset.assetId,
    assignment: input.assignToCharacterImageMap,
  });

  return {
    assetId: result.asset.assetId,
    assetName: result.asset.assetName,
    assetPath: result.asset.assetPath,
    ...(input.assignToCharacterImageMap === undefined ? {} : { assignedCharacterImageMap: input.assignToCharacterImageMap }),
  };
}

function notifyStudioPixelAssetSaved(
  projectId: string,
  detail: { assetId: string; assignment?: SavePixelDocumentInput["assignToCharacterImageMap"] },
): void {
  const message = {
    type: "retro-short-studio.pixel-asset-saved",
    projectId,
    assetId: detail.assetId,
    assignment: detail.assignment,
  };

  if (typeof window === "undefined") {
    return;
  }

  window.opener?.postMessage(message, window.location.origin);
}
