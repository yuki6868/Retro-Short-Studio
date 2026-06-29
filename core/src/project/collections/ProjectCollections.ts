export type ProjectSceneRef = {
  sceneId: string;
};

export type ProjectAssetRef = {
  assetId: string;
};

export type ProjectCharacterRef = {
  characterId: string;
};

export type ProjectCollectionsSnapshot = {
  scenes: ProjectSceneRef[];
  assets: ProjectAssetRef[];
  characters: ProjectCharacterRef[];
};

export class ProjectCollections {
  private constructor(
    private readonly scenes: ProjectSceneRef[],
    private readonly assets: ProjectAssetRef[],
    private readonly characters: ProjectCharacterRef[],
  ) {}

  static empty(): ProjectCollections {
    return new ProjectCollections([], [], []);
  }

  static fromSnapshot(snapshot: ProjectCollectionsSnapshot): ProjectCollections {
    return new ProjectCollections(
      snapshot.scenes.map((scene) => ({ ...scene })),
      snapshot.assets.map((asset) => ({ ...asset })),
      snapshot.characters.map((character) => ({ ...character })),
    );
  }

  toSnapshot(): ProjectCollectionsSnapshot {
    return {
      scenes: this.scenes.map((scene) => ({ ...scene })),
      assets: this.assets.map((asset) => ({ ...asset })),
      characters: this.characters.map((character) => ({ ...character })),
    };
  }
}
