import { afterEach, describe, expect, it, vi } from "vitest";

import { BrowserProjectFolderFileStore, type FileSystemDirectoryHandleLike } from "../../frontend/src/react";

class MemoryWritableFileStream {
  constructor(private readonly commit: (data: Uint8Array | string) => void) {}

  async write(data: Uint8Array | string): Promise<void> {
    this.commit(data);
  }

  async close(): Promise<void> {}
}

class MemoryFileHandle {
  constructor(private readonly commit: (data: Uint8Array | string) => void) {}

  async createWritable(): Promise<MemoryWritableFileStream> {
    return new MemoryWritableFileStream(this.commit);
  }
}

class MemoryDirectoryHandle implements FileSystemDirectoryHandleLike {
  readonly directories = new Map<string, MemoryDirectoryHandle>();
  readonly files = new Map<string, Uint8Array | string>();

  constructor(readonly name: string) {}

  async getDirectoryHandle(name: string, options: { create?: boolean } = {}): Promise<MemoryDirectoryHandle> {
    const current = this.directories.get(name);

    if (current !== undefined) {
      return current;
    }

    if (options.create !== true) {
      throw new Error(`Directory not found: ${name}`);
    }

    const next = new MemoryDirectoryHandle(name);
    this.directories.set(name, next);
    return next;
  }

  async getFileHandle(name: string, options: { create?: boolean } = {}): Promise<MemoryFileHandle> {
    if (!this.files.has(name) && options.create !== true) {
      throw new Error(`File not found: ${name}`);
    }

    return new MemoryFileHandle((data) => this.files.set(name, data));
  }

  async queryPermission(): Promise<"granted"> {
    return "granted";
  }
}

describe("BrowserProjectFolderFileStore", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it("writes imported assets under the selected project folder", async () => {
    const root = new MemoryDirectoryHandle("MyProject");
    const store = new BrowserProjectFolderFileStore();

    store.setProjectFolder(root);
    await store.write({ relativePath: "assets/backgrounds/bg.png", data: new Uint8Array([1, 2, 3]) });

    const assets = root.directories.get("assets");
    const backgrounds = assets?.directories.get("backgrounds");

    expect(backgrounds?.files.get("bg.png")).toEqual(new Uint8Array([1, 2, 3]));
    expect(await store.exists("assets/backgrounds/bg.png")).toBe(true);
  });

  it("writes project.json into the selected project folder", async () => {
    const root = new MemoryDirectoryHandle("MyProject");
    const store = new BrowserProjectFolderFileStore();

    store.setProjectFolder(root);
    const result = await store.writeProjectJson('{"projectName":"Demo"}');

    expect(result).toEqual({ folderName: "MyProject", projectJsonPath: "project.json" });
    expect(root.files.get("project.json")).toBe('{"projectName":"Demo"}');
  });


  it("prompts for a project folder on demand before the first asset import", async () => {
    const root = new MemoryDirectoryHandle("PromptedProject");
    const store = new BrowserProjectFolderFileStore();
    vi.stubGlobal("showDirectoryPicker", async () => root);

    await expect(store.ensureProjectFolderSelected()).resolves.toBe("PromptedProject");
    await store.write({ relativePath: "assets/backgrounds/bg.png", data: new Uint8Array([9]) });

    expect(root.directories.get("assets")?.directories.get("backgrounds")?.files.get("bg.png")).toEqual(new Uint8Array([9]));
  });

  it("requires a project folder before writing assets", async () => {
    const store = new BrowserProjectFolderFileStore();

    await expect(store.write({ relativePath: "assets/backgrounds/bg.png", data: new Uint8Array() })).rejects.toThrow(
      "Choose a project folder before importing assets.",
    );
  });
});
