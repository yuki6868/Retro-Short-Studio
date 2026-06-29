import { Asset, type AssetSnapshot } from "../../asset";

export type ProjectSceneRef = {
  sceneId: string;
};

export type ProjectCharacterRef = {
  characterId: string;
};

export type ProjectCollectionsSnapshot = {
  scenes: ProjectSceneRef[];
  assets: AssetSnapshot[];
  characters: ProjectCharacterRef[];
};

export class ProjectCollections {
  private constructor(
    private readonly scenes: ProjectSceneRef[],
    private readonly assets: Asset[],
    private readonly characters: ProjectCharacterRef[],
  ) {}

  static empty(): ProjectCollections {
    return new ProjectCollections([], [], []);
  }

  static fromSnapshot(snapshot: ProjectCollectionsSnapshot): ProjectCollections {
    return new ProjectCollections(
      snapshot.scenes.map((scene) => ({ ...scene })),
      snapshot.assets.map((asset) => Asset.restore(asset)),
      snapshot.characters.map((character) => ({ ...character })),
    );
  }

  addAsset(asset: Asset): ProjectCollections {
    const assetId = asset.toSnapshot().assetId;

    if (this.assets.some((currentAsset) => currentAsset.toSnapshot().assetId === assetId)) {
      throw new Error(`Asset already exists: ${assetId}.`);
    }

    return new ProjectCollections(
      this.scenes.map((scene) => ({ ...scene })),
      [...this.assets, Asset.restore(asset.toSnapshot())],
      this.characters.map((character) => ({ ...character })),
    );
  }

  toSnapshot(): ProjectCollectionsSnapshot {
    return {
      scenes: this.scenes.map((scene) => ({ ...scene })),
      assets: this.assets.map((asset) => asset.toSnapshot()),
      characters: this.characters.map((character) => ({ ...character })),
    };
  }
}
