import { Project, type ProjectSnapshot } from "../../../core/src";

export const BROWSER_PROJECT_STORAGE_KEY = "retro-short-studio.project.local-preview";
export const BROWSER_PROJECT_INDEX_STORAGE_KEY = "retro-short-studio.projects.index";
export const BROWSER_ACTIVE_PROJECT_STORAGE_KEY = "retro-short-studio.projects.activeProjectId";

export type BrowserProjectSummary = {
  projectId: string;
  projectName: string;
  updatedAt: string;
};

export type BrowserProjectStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
};

export function listBrowserProjects(storage = getDefaultStorage()): BrowserProjectSummary[] {
  if (storage === null) {
    return [];
  }

  const indexed = loadBrowserProjectIndex(storage);

  if (indexed.length > 0) {
    return indexed;
  }

  const legacySnapshot = loadLegacyBrowserProjectSnapshot(storage);
  return legacySnapshot === null
    ? []
    : [
        {
          projectId: legacySnapshot.projectId,
          projectName: legacySnapshot.projectName,
          updatedAt: "",
        },
      ];
}

export function getActiveBrowserProjectId(storage = getDefaultStorage()): string | null {
  if (storage === null) {
    return null;
  }

  const activeProjectId = storage.getItem(BROWSER_ACTIVE_PROJECT_STORAGE_KEY);
  return activeProjectId !== null && activeProjectId.trim().length > 0 ? activeProjectId : null;
}

export function setActiveBrowserProjectId(projectId: string, storage = getDefaultStorage()): void {
  if (storage === null) {
    return;
  }

  storage.setItem(BROWSER_ACTIVE_PROJECT_STORAGE_KEY, projectId);
}

export function loadBrowserProjectSnapshot(storage = getDefaultStorage()): ProjectSnapshot | null {
  if (storage === null) {
    return null;
  }

  const activeProjectId = getActiveBrowserProjectId(storage);

  if (activeProjectId !== null) {
    const activeSnapshot = loadBrowserProjectSnapshotById(activeProjectId, storage);

    if (activeSnapshot !== null) {
      return activeSnapshot;
    }
  }

  const firstSavedProject = listBrowserProjects(storage)[0];

  if (firstSavedProject !== undefined) {
    const firstSnapshot = loadBrowserProjectSnapshotById(firstSavedProject.projectId, storage);

    if (firstSnapshot !== null) {
      return firstSnapshot;
    }
  }

  return loadLegacyBrowserProjectSnapshot(storage);
}

export function loadBrowserProjectSnapshotById(
  projectId: string,
  storage = getDefaultStorage(),
): ProjectSnapshot | null {
  if (storage === null) {
    return null;
  }

  const raw = storage.getItem(createBrowserProjectStorageKey(projectId));

  if (raw === null || raw.trim().length === 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return isProjectSnapshotLike(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function hasSavedBrowserProject(storage = getDefaultStorage()): boolean {
  return listBrowserProjects(storage).length > 0;
}

export function findBrowserProjectByName(
  projectName: string,
  storage = getDefaultStorage(),
): BrowserProjectSummary | null {
  if (storage === null) {
    return null;
  }

  const normalizedProjectName = normalizeProjectNameForLookup(projectName);

  if (normalizedProjectName.length === 0) {
    return null;
  }

  return (
    listBrowserProjects(storage).find(
      (project) => normalizeProjectNameForLookup(project.projectName) === normalizedProjectName,
    ) ?? null
  );
}

export function loadBrowserProject(storage = getDefaultStorage()): Project | null {
  const snapshot = loadBrowserProjectSnapshot(storage);

  if (snapshot === null) {
    return null;
  }

  try {
    return Project.restore(snapshot);
  } catch {
    return null;
  }
}

export function loadBrowserProjectById(projectId: string, storage = getDefaultStorage()): Project | null {
  const snapshot = loadBrowserProjectSnapshotById(projectId, storage);

  if (snapshot === null) {
    return null;
  }

  try {
    return Project.restore(snapshot);
  } catch {
    return null;
  }
}

export function saveBrowserProject(
  project: Project,
  storageOrProjectName?: BrowserProjectStorage | string | null,
  maybeStorage = getDefaultStorage(),
): BrowserProjectSummary | null {
  const projectName = typeof storageOrProjectName === "string" ? storageOrProjectName : null;
  const storage = typeof storageOrProjectName === "string" || storageOrProjectName === undefined ? maybeStorage : storageOrProjectName;

  if (storage === null) {
    return null;
  }

  if (projectName !== null && projectName.trim().length > 0) {
    project.rename(projectName.trim());
  }

  return saveBrowserProjectSnapshot(project.toSnapshot(), storage);
}

export function saveBrowserProjectAsNew(
  project: Project,
  projectName: string,
  storage = getDefaultStorage(),
  projectId = createBrowserProjectId(),
): BrowserProjectSummary | null {
  if (storage === null) {
    return null;
  }

  const trimmedProjectName = projectName.trim();
  const nextProjectName = trimmedProjectName.length > 0 ? trimmedProjectName : project.toSnapshot().projectName;

  if (findBrowserProjectByName(nextProjectName, storage) !== null) {
    return null;
  }

  const snapshot: ProjectSnapshot = {
    ...project.toSnapshot(),
    projectId,
    projectName: nextProjectName,
  };

  return saveBrowserProjectSnapshot(snapshot, storage);
}

function saveBrowserProjectSnapshot(snapshot: ProjectSnapshot, storage: BrowserProjectStorage): BrowserProjectSummary {
  const summary: BrowserProjectSummary = {
    projectId: snapshot.projectId,
    projectName: snapshot.projectName,
    updatedAt: new Date().toISOString(),
  };

  storage.setItem(createBrowserProjectStorageKey(snapshot.projectId), JSON.stringify(snapshot));
  storage.setItem(BROWSER_PROJECT_STORAGE_KEY, JSON.stringify(snapshot));
  storage.setItem(BROWSER_ACTIVE_PROJECT_STORAGE_KEY, snapshot.projectId);
  storage.setItem(BROWSER_PROJECT_INDEX_STORAGE_KEY, JSON.stringify(upsertProjectSummary(loadBrowserProjectIndex(storage), summary)));

  return summary;
}

function createBrowserProjectId(): string {
  const maybeCrypto = globalThis as typeof globalThis & { crypto?: { randomUUID?: () => string } };
  const randomId = maybeCrypto.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `project-${randomId}`;
}

function loadLegacyBrowserProjectSnapshot(storage: BrowserProjectStorage): ProjectSnapshot | null {
  const raw = storage.getItem(BROWSER_PROJECT_STORAGE_KEY);

  if (raw === null || raw.trim().length === 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return isProjectSnapshotLike(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function loadBrowserProjectIndex(storage: BrowserProjectStorage): BrowserProjectSummary[] {
  const raw = storage.getItem(BROWSER_PROJECT_INDEX_STORAGE_KEY);

  if (raw === null || raw.trim().length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isBrowserProjectSummaryLike) : [];
  } catch {
    return [];
  }
}

function upsertProjectSummary(
  summaries: BrowserProjectSummary[],
  nextSummary: BrowserProjectSummary,
): BrowserProjectSummary[] {
  const withoutCurrent = summaries.filter((summary) => summary.projectId !== nextSummary.projectId);
  return [nextSummary, ...withoutCurrent].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function createBrowserProjectStorageKey(projectId: string): string {
  return `${BROWSER_PROJECT_STORAGE_KEY}.${projectId}`;
}

function normalizeProjectNameForLookup(projectName: string): string {
  return projectName.trim().toLowerCase();
}

function getDefaultStorage(): BrowserProjectStorage | null {
  const maybeStorage = globalThis as typeof globalThis & { localStorage?: BrowserProjectStorage };
  return maybeStorage.localStorage ?? null;
}

function isProjectSnapshotLike(value: unknown): value is ProjectSnapshot {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.projectId === "string" &&
    typeof value.projectName === "string" &&
    isRecord(value.settings) &&
    Array.isArray(value.scenes) &&
    Array.isArray(value.assets) &&
    Array.isArray(value.characters)
  );
}

function isBrowserProjectSummaryLike(value: unknown): value is BrowserProjectSummary {
  return (
    isRecord(value) &&
    typeof value.projectId === "string" &&
    typeof value.projectName === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
