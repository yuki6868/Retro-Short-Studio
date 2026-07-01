import { Project, type ProjectSnapshot } from "../../../core/src";

export const BROWSER_PROJECT_STORAGE_KEY = "retro-short-studio.project.local-preview";

export type BrowserProjectStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
};

export function loadBrowserProjectSnapshot(storage = getDefaultStorage()): ProjectSnapshot | null {
  if (storage === null) {
    return null;
  }

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

export function saveBrowserProject(project: Project, storage = getDefaultStorage()): void {
  if (storage === null) {
    return;
  }

  storage.setItem(BROWSER_PROJECT_STORAGE_KEY, JSON.stringify(project.toSnapshot()));
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
