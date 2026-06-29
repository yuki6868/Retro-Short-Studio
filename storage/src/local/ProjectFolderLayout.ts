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
