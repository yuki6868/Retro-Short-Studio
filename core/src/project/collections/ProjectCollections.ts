import { Asset, type AssetSnapshot } from "../../asset";
import { Scene, type SceneSnapshot } from "../../scene";

export type ProjectCharacterRef = {
  characterId: string;
};

export type ProjectCollectionsSnapshot = {
  scenes: SceneSnapshot[];
  assets: AssetSnapshot[];
  characters: ProjectCharacterRef[];
};

export class ProjectCollections {
  private constructor(
    private readonly scenes: Scene[],
    private readonly assets: Asset[],
    private readonly characters: ProjectCharacterRef[],
  ) {}

  static empty(): ProjectCollections {
    return new ProjectCollections([], [], []);
  }

  static fromSnapshot(snapshot: ProjectCollectionsSnapshot): ProjectCollections {
    return new ProjectCollections(
      snapshot.scenes.map((scene) => Scene.restore(scene)),
      snapshot.assets.map((asset) => Asset.restore(asset)),
      snapshot.characters.map((character) => ({ ...character })),
    );
  }

  addScene(scene: Scene): ProjectCollections {
    const sceneId = scene.toSnapshot().sceneId;

    if (this.scenes.some((currentScene) => currentScene.toSnapshot().sceneId === sceneId)) {
      throw new Error(`Scene already exists: ${sceneId}.`);
    }

    return new ProjectCollections(
      [...this.scenes, Scene.restore(scene.toSnapshot())],
      this.assets.map((asset) => Asset.restore(asset.toSnapshot())),
      this.characters.map((character) => ({ ...character })),
    );
  }

  addAsset(asset: Asset): ProjectCollections {
    const assetId = asset.toSnapshot().assetId;

    if (this.assets.some((currentAsset) => currentAsset.toSnapshot().assetId === assetId)) {
      throw new Error(`Asset already exists: ${assetId}.`);
    }

    return new ProjectCollections(
      this.scenes.map((scene) => Scene.restore(scene.toSnapshot())),
      [...this.assets, Asset.restore(asset.toSnapshot())],
      this.characters.map((character) => ({ ...character })),
    );
  }

  toSnapshot(): ProjectCollectionsSnapshot {
    return {
      scenes: this.scenes.map((scene) => scene.toSnapshot()),
      assets: this.assets.map((asset) => asset.toSnapshot()),
      characters: this.characters.map((character) => ({ ...character })),
    };
  }
}
