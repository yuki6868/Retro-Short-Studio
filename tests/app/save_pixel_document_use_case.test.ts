import { describe, expect, it } from "vitest";

import { SavePixelDocumentUseCase, encodePixelDocumentToPng, type AssetFileStore, type AssetFileWriteInput } from "../../app/src";
import { DeterministicIdGenerator, PixelDocument, Project } from "../../core/src";

class MemoryAssetFileStore implements AssetFileStore {
  readonly writes: AssetFileWriteInput[] = [];
  private readonly existing = new Set<string>();

  constructor(existing: string[] = []) {
    existing.forEach((path) => this.existing.add(path));
  }

  async exists(relativePath: string): Promise<boolean> {
    return this.existing.has(relativePath);
  }

  async write(input: AssetFileWriteInput): Promise<void> {
    this.existing.add(input.relativePath);
    this.writes.push(input);
  }
}

describe("SavePixelDocumentUseCase", () => {
  it("exports a pixel document as PNG and registers it as a character image asset", async () => {
    const project = Project.create({ projectId: "project-1", projectName: "Pixel Short" });
    const fileStore = new MemoryAssetFileStore();
    const useCase = new SavePixelDocumentUseCase({
      project,
      idGenerator: new DeterministicIdGenerator(),
      fileStore,
    });
    const document = PixelDocument.create({ documentId: "pixel-1", projectId: "project-1", size: 16 })
      .paintPixel(0, 0, "#29adff")
      .toSnapshot();

    const result = await useCase.save({ document, assetName: "zundamon_default" });

    expect(result.asset).toEqual({
      assetId: "asset-1",
      assetName: "zundamon_default",
      assetType: "character_image",
      assetPath: "assets/characters/zundamon_default.png",
    });
    expect(project.toSnapshot().assets).toEqual([result.asset]);
    expect(fileStore.writes).toHaveLength(1);
    expect(fileStore.writes[0]?.relativePath).toBe("assets/characters/zundamon_default.png");
    expect([...fileStore.writes[0]!.data.slice(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  });

  it("uses a unique asset path when a PNG already exists", async () => {
    const project = Project.create({ projectId: "project-1", projectName: "Pixel Short" });
    const fileStore = new MemoryAssetFileStore(["assets/characters/zundamon.png"]);
    const useCase = new SavePixelDocumentUseCase({
      project,
      idGenerator: new DeterministicIdGenerator(),
      fileStore,
    });
    const document = PixelDocument.create({ documentId: "pixel-1", projectId: "project-1", size: 16 }).toSnapshot();

    const result = await useCase.save({ document, assetName: "zundamon" });

    expect(result.asset.assetPath).toBe("assets/characters/zundamon-1.png");
    expect(fileStore.writes[0]?.relativePath).toBe("assets/characters/zundamon-1.png");
  });
});

describe("encodePixelDocumentToPng", () => {
  it("creates PNG bytes with an IHDR chunk", () => {
    const document = PixelDocument.create({ documentId: "pixel-1", projectId: "project-1", size: 16 }).toSnapshot();

    const png = encodePixelDocumentToPng(document);

    expect([...png.slice(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(String.fromCharCode(...png.slice(12, 16))).toBe("IHDR");
  });
});
