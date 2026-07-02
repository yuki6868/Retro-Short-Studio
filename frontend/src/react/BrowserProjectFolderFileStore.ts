import type { AssetFileStore, AssetFileWriteInput } from "../../../app/src";

export type FileSystemWritePermissionMode = "readwrite";

type FileSystemPermissionState = "granted" | "denied" | "prompt";

type FileSystemWritableFileStreamLike = {
  write(data: Uint8Array | string): Promise<void>;
  close(): Promise<void>;
};

export type FileSystemFileHandleLike = {
  createWritable(): Promise<FileSystemWritableFileStreamLike>;
  getFile?(): Promise<File>;
};

export type FileSystemDirectoryHandleLike = {
  name: string;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandleLike>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandleLike>;
  queryPermission?(descriptor?: { mode: FileSystemWritePermissionMode }): Promise<FileSystemPermissionState>;
  requestPermission?(descriptor?: { mode: FileSystemWritePermissionMode }): Promise<FileSystemPermissionState>;
};

type ShowDirectoryPickerHost = typeof globalThis & {
  showDirectoryPicker?: (options?: { mode?: FileSystemWritePermissionMode }) => Promise<FileSystemDirectoryHandleLike>;
};

export type ProjectFolderWriteResult = {
  folderName: string;
  projectJsonPath: "project.json";
};

export class BrowserProjectFolderFileStore implements AssetFileStore {
  private projectFolderHandle: FileSystemDirectoryHandleLike | null = null;

  get hasProjectFolder(): boolean {
    return this.projectFolderHandle !== null;
  }

  get projectFolderName(): string | null {
    return this.projectFolderHandle?.name ?? null;
  }

  setProjectFolder(handle: FileSystemDirectoryHandleLike): void {
    this.projectFolderHandle = handle;
  }

  async chooseProjectFolder(): Promise<string> {
    const picker = (globalThis as ShowDirectoryPickerHost).showDirectoryPicker;

    if (picker === undefined) {
      throw new Error("Local project folder selection is not supported by this browser.");
    }

    const handle = await picker({ mode: "readwrite" });
    await ensureWritePermission(handle);
    this.setProjectFolder(handle);
    return handle.name;
  }

  async ensureProjectFolderSelected(): Promise<string> {
    if (this.projectFolderHandle !== null) {
      return this.projectFolderHandle.name;
    }

    return this.chooseProjectFolder();
  }

  async exists(relativePath: string): Promise<boolean> {
    const handle = this.requireProjectFolder();

    try {
      await resolveProjectFileHandle(handle, normalizeProjectRelativePath(relativePath), { create: false });
      return true;
    } catch {
      return false;
    }
  }

  async write(input: AssetFileWriteInput): Promise<void> {
    const handle = this.requireProjectFolder();
    await writeProjectRelativeFile(handle, input.relativePath, input.data);
  }

  async writeProjectJson(projectJson: string): Promise<ProjectFolderWriteResult> {
    const handle = this.requireProjectFolder();
    await writeProjectRelativeFile(handle, "project.json", projectJson);

    return {
      folderName: handle.name,
      projectJsonPath: "project.json",
    };
  }

  private requireProjectFolder(): FileSystemDirectoryHandleLike {
    if (this.projectFolderHandle === null) {
      throw new Error("Choose a project folder before importing assets.");
    }

    return this.projectFolderHandle;
  }
}

export function isLocalProjectFolderSupported(): boolean {
  return (globalThis as ShowDirectoryPickerHost).showDirectoryPicker !== undefined;
}

async function ensureWritePermission(handle: FileSystemDirectoryHandleLike): Promise<void> {
  const descriptor = { mode: "readwrite" as const };
  const currentPermission = await handle.queryPermission?.(descriptor);

  if (currentPermission === "granted" || currentPermission === undefined) {
    return;
  }

  const requestedPermission = await handle.requestPermission?.(descriptor);

  if (requestedPermission !== "granted") {
    throw new Error("Project folder write permission was not granted.");
  }
}

async function writeProjectRelativeFile(
  rootHandle: FileSystemDirectoryHandleLike,
  relativePath: string,
  data: Uint8Array | string,
): Promise<void> {
  const fileHandle = await resolveProjectFileHandle(rootHandle, normalizeProjectRelativePath(relativePath), { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(data);
  await writable.close();
}

async function resolveProjectFileHandle(
  rootHandle: FileSystemDirectoryHandleLike,
  relativePath: string,
  options: { create: boolean },
): Promise<FileSystemFileHandleLike> {
  const segments = normalizeProjectRelativePath(relativePath).split("/");
  const fileName = segments.pop();

  if (fileName === undefined || fileName.length === 0) {
    throw new Error(`Project-relative file path is required: ${relativePath}.`);
  }

  let currentDirectory = rootHandle;

  for (const segment of segments) {
    currentDirectory = await currentDirectory.getDirectoryHandle(segment, { create: options.create });
  }

  return currentDirectory.getFileHandle(fileName, { create: options.create });
}

function normalizeProjectRelativePath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/").replace(/\/+/g, "/");

  if (
    normalized.length === 0 ||
    normalized.startsWith("/") ||
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  ) {
    throw new Error(`Path must stay inside the project folder: ${relativePath}.`);
  }

  return normalized;
}
