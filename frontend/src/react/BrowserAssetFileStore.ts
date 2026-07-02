import type { AssetFileStore, AssetFileWriteInput } from "../../../app/src";

const BROWSER_ASSET_STORAGE_PREFIX = "retro-short-studio.asset-file.";

export class BrowserAssetFileStore implements AssetFileStore {
  async exists(relativePath: string): Promise<boolean> {
    return globalThis.localStorage?.getItem(createStorageKey(relativePath)) !== null;
  }

  async write(input: AssetFileWriteInput): Promise<void> {
    const storage = globalThis.localStorage;

    if (storage === undefined) {
      throw new Error("Browser asset storage is not available.");
    }

    storage.setItem(
      createStorageKey(input.relativePath),
      JSON.stringify({
        relativePath: input.relativePath,
        dataBase64: uint8ArrayToBase64(input.data),
        savedAt: new Date().toISOString(),
      }),
    );
  }
}

function createStorageKey(relativePath: string): string {
  return `${BROWSER_ASSET_STORAGE_PREFIX}${relativePath}`;
}

function uint8ArrayToBase64(data: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;

  for (let offset = 0; offset < data.length; offset += chunkSize) {
    const chunk = data.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return globalThis.btoa(binary);
}
