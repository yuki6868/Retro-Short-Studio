import path from "node:path";

export const PROJECT_FILE_NAME = "project.rss.json";

export const PROJECT_FOLDER_NAMES = {
  assets: "assets",
  characters: "assets/characters",
  backgrounds: "assets/backgrounds",
  effects: "assets/effects",
  voices: "voices",
  renders: "renders",
  exports: "exports",
} as const;

export type ProjectFolderName = keyof typeof PROJECT_FOLDER_NAMES;

export type ProjectFolderPaths = {
  projectRootPath: string;
  projectFilePath: string;
  folders: Record<ProjectFolderName, string>;
};

export function resolveProjectFolderPaths(projectRootPath: string): ProjectFolderPaths {
  return {
    projectRootPath,
    projectFilePath: path.join(projectRootPath, PROJECT_FILE_NAME),
    folders: Object.fromEntries(
      Object.entries(PROJECT_FOLDER_NAMES).map(([folderKey, folderName]) => [
        folderKey,
        path.join(projectRootPath, folderName),
      ]),
    ) as Record<ProjectFolderName, string>,
  };
}
