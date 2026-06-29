import { mkdir } from "node:fs/promises";

import { resolveProjectFolderPaths } from "./ProjectFolderLayout";

export async function ensureProjectFolder(projectRootPath: string): Promise<void> {
  const { projectRootPath: resolvedProjectRootPath, folders } =
    resolveProjectFolderPaths(projectRootPath);

  await mkdir(resolvedProjectRootPath, { recursive: true });

  await Promise.all(
    Object.values(folders).map((folderPath) =>
      mkdir(folderPath, { recursive: true }),
    ),
  );
}
