import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

import type { AssetFileStore, AssetFileWriteInput } from "../../../app/src";

export class LocalProjectAssetFileStore implements AssetFileStore {
  constructor(private readonly projectRootPath: string) {}

  async exists(relativePath: string): Promise<boolean> {
    return existsSync(this.resolveProjectRelativePath(relativePath));
  }

  async write(input: AssetFileWriteInput): Promise<void> {
    const destinationPath = this.resolveProjectRelativePath(input.relativePath);
    await mkdir(path.dirname(destinationPath), { recursive: true });
    await writeFile(destinationPath, input.data);
  }

  private resolveProjectRelativePath(relativePath: string): string {
    const normalizedRelativePath = relativePath.replace(/\\/g, "/");

    if (normalizedRelativePath.startsWith("/") || normalizedRelativePath.includes("../") || normalizedRelativePath === "..") {
      throw new Error(`Asset path must be inside the project folder: ${relativePath}.`);
    }

    return path.join(this.projectRootPath, normalizedRelativePath);
  }
}
