import { Asset, type IdGenerator, type PixelDocumentSnapshot, type Project } from "../../../core/src";
import type { AssetDto } from "../../../shared";
import type { AssetFileStore } from "../asset";
import { encodePixelDocumentToPng } from "./PixelPngEncoder";

export type SavePixelDocumentInput = {
  document: PixelDocumentSnapshot;
  assetName: string;
};

export type SavePixelDocumentResult = {
  asset: AssetDto;
  assetCount: number;
};

export type SavePixelDocumentUseCaseConfig = {
  project: Project;
  idGenerator: IdGenerator;
  fileStore: AssetFileStore;
};

export class SavePixelDocumentUseCase {
  constructor(private readonly config: SavePixelDocumentUseCaseConfig) {}

  async save(input: SavePixelDocumentInput): Promise<SavePixelDocumentResult> {
    const assetName = normalizeAssetName(input.assetName);
    const fileName = `${assetName}.png`;
    const relativePath = await this.createUniqueRelativePath(fileName);
    const data = encodePixelDocumentToPng(input.document);

    await this.config.fileStore.write({ relativePath, data });

    const asset = Asset.create({
      assetId: this.config.idGenerator.generate("asset"),
      assetName,
      assetType: "character_image",
      assetPath: relativePath,
    });

    this.config.project.addAsset(asset);
    const assetSnapshot = asset.toSnapshot();

    return {
      asset: {
        assetId: assetSnapshot.assetId,
        assetName: assetSnapshot.assetName,
        assetType: "character_image",
        assetPath: assetSnapshot.assetPath,
      },
      assetCount: this.config.project.toSnapshot().assets.length,
    };
  }

  private async createUniqueRelativePath(fileName: string): Promise<string> {
    const baseName = fileName.slice(0, -4);
    let candidate = `assets/characters/${fileName}`;
    let suffix = 1;

    while (await this.config.fileStore.exists(candidate)) {
      candidate = `assets/characters/${baseName}-${suffix}.png`;
      suffix += 1;
    }

    return candidate;
  }
}

function normalizeAssetName(assetName: string): string {
  const normalized = assetName.trim().replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");

  if (normalized.length === 0 || normalized === "." || normalized === "..") {
    throw new Error("Pixel asset name is required.");
  }

  return normalized;
}
