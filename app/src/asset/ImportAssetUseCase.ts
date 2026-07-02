import { Asset } from "../../../core/src";
import type { IdGenerator, Project } from "../../../core/src";
import type { AssetDto } from "../../../shared";
import type { AssetLibraryState } from "./AssetLibraryUseCase";

export type ImportableAssetType = "background" | "character_image" | "voice";

export type ImportAssetFile = {
  name: string;
  arrayBuffer(): Promise<ArrayBuffer>;
};

export type ImportAssetInput = {
  assetType: ImportableAssetType;
  file: ImportAssetFile;
};

export type AssetFileWriteInput = {
  relativePath: string;
  data: Uint8Array;
};

export type AssetFileStore = {
  exists(relativePath: string): Promise<boolean>;
  write(input: AssetFileWriteInput): Promise<void>;
};

export type ImportAssetResult = {
  asset: AssetDto;
  assetState: AssetLibraryState;
};

export type ImportAssetUseCaseConfig = {
  project: Project;
  idGenerator: IdGenerator;
  fileStore: AssetFileStore;
};

export class ImportAssetUseCase {
  private selectedAssetId: string | null = null;

  constructor(private readonly config: ImportAssetUseCaseConfig) {}

  async importAsset(input: ImportAssetInput): Promise<ImportAssetResult> {
    const fileName = sanitizeFileName(input.file.name);
    const assetType = normalizeImportableAssetType(input.assetType);
    const relativePath = await this.createUniqueRelativePath(assetType, fileName);
    const data = new Uint8Array(await input.file.arrayBuffer());

    await this.config.fileStore.write({ relativePath, data });

    const asset = Asset.create({
      assetId: this.config.idGenerator.generate("asset"),
      assetName: createAssetName(fileName),
      assetType,
      assetPath: relativePath,
    });

    this.config.project.addAsset(asset);
    const assetSnapshot = asset.toSnapshot();
    this.selectedAssetId = assetSnapshot.assetId;

    return {
      asset: toAssetDto(assetSnapshot),
      assetState: this.createState(),
    };
  }

  private async createUniqueRelativePath(assetType: ImportableAssetType, fileName: string): Promise<string> {
    const folder = folderForAssetType(assetType);
    const extensionIndex = fileName.lastIndexOf(".");
    const baseName = extensionIndex > 0 ? fileName.slice(0, extensionIndex) : fileName;
    const extension = extensionIndex > 0 ? fileName.slice(extensionIndex) : "";

    let candidate = normalizeAssetPath(`${folder}/${fileName}`);
    let suffix = 1;

    while (await this.config.fileStore.exists(candidate)) {
      candidate = normalizeAssetPath(`${folder}/${baseName}-${suffix}${extension}`);
      suffix += 1;
    }

    return candidate;
  }

  private createState(): AssetLibraryState {
    const assets = this.config.project.toSnapshot().assets.map(toAssetDto);

    return {
      assets,
      selectedAssetId: assets.some((asset) => asset.assetId === this.selectedAssetId) ? this.selectedAssetId : null,
    };
  }
}

function normalizeImportableAssetType(assetType: ImportableAssetType): ImportableAssetType {
  if (assetType !== "background" && assetType !== "character_image" && assetType !== "voice") {
    throw new Error(`Unsupported import asset type: ${String(assetType)}.`);
  }

  return assetType;
}

function folderForAssetType(assetType: ImportableAssetType): string {
  switch (assetType) {
    case "background":
      return "assets/backgrounds";
    case "character_image":
      return "assets/characters";
    case "voice":
      return "voices";
  }
}

function sanitizeFileName(fileName: string): string {
  const normalized = fileName.trim().replace(/\\/g, "/").split("/").filter(Boolean).at(-1) ?? "";
  const safe = normalized.replace(/[^a-zA-Z0-9._-]/g, "_");

  if (safe.length === 0 || safe === "." || safe === "..") {
    throw new Error("Import asset file name is required.");
  }

  return safe;
}

function createAssetName(fileName: string): string {
  const extensionIndex = fileName.lastIndexOf(".");
  return extensionIndex > 0 ? fileName.slice(0, extensionIndex) : fileName;
}

function normalizeAssetPath(assetPath: string): string {
  const normalized = assetPath.replace(/\\/g, "/").replace(/\/+/g, "/");

  if (normalized.startsWith("/") || normalized.includes("../") || normalized === "..") {
    throw new Error(`Asset path must be project-relative: ${assetPath}.`);
  }

  return normalized;
}

function toAssetDto(asset: { assetId: string; assetName: string; assetType: string; assetPath: string }): AssetDto {
  return {
    assetId: asset.assetId,
    assetName: asset.assetName,
    assetType: asset.assetType as AssetDto["assetType"],
    assetPath: asset.assetPath,
  };
}
