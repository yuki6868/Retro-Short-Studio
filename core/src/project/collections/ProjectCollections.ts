import { Asset, type AssetSnapshot } from "../../asset";
import { CharacterModel, type CharacterModelSnapshot } from "../../character";
import { Scene, type SceneSnapshot } from "../../scene";

export type ProjectCollectionsSnapshot = {
  scenes: SceneSnapshot[];
  assets: AssetSnapshot[];
  characters: CharacterModelSnapshot[];
};

export class ProjectCollections {
  private constructor(
    private readonly scenes: Scene[],
    private readonly assets: Asset[],
    private readonly characters: CharacterModel[],
  ) {}

  static empty(): ProjectCollections {
    return new ProjectCollections([], [], []);
  }

  static fromSnapshot(snapshot: ProjectCollectionsSnapshot): ProjectCollections {
    return new ProjectCollections(
      snapshot.scenes.map((scene) => Scene.restore(scene)),
      snapshot.assets.map((asset) => Asset.restore(asset)),
      snapshot.characters.map((character) => CharacterModel.restore(character)),
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
      this.characters.map((character) => CharacterModel.restore(character.toSnapshot())),
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
      this.characters.map((character) => CharacterModel.restore(character.toSnapshot())),
    );
  }

  addCharacterModel(character: CharacterModel): ProjectCollections {
    const characterId = character.toSnapshot().characterId;

    if (this.characters.some((currentCharacter) => currentCharacter.toSnapshot().characterId === characterId)) {
      throw new Error(`Character already exists: ${characterId}.`);
    }

    return new ProjectCollections(
      this.scenes.map((scene) => Scene.restore(scene.toSnapshot())),
      this.assets.map((asset) => Asset.restore(asset.toSnapshot())),
      [...this.characters, CharacterModel.restore(character.toSnapshot())],
    );
  }

  toSnapshot(): ProjectCollectionsSnapshot {
    return {
      scenes: this.scenes.map((scene) => scene.toSnapshot()),
      assets: this.assets.map((asset) => asset.toSnapshot()),
      characters: this.characters.map((character) => character.toSnapshot()),
    };
  }
}
