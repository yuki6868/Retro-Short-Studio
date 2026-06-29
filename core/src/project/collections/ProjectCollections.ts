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


  removeScene(sceneId: string): ProjectCollections {
    if (!this.scenes.some((scene) => scene.toSnapshot().sceneId === sceneId)) {
      throw new Error(`Scene does not exist: ${sceneId}.`);
    }

    return new ProjectCollections(
      this.scenes
        .filter((scene) => scene.toSnapshot().sceneId !== sceneId)
        .map((scene) => Scene.restore(scene.toSnapshot())),
      this.assets.map((asset) => Asset.restore(asset.toSnapshot())),
      this.characters.map((character) => CharacterModel.restore(character.toSnapshot())),
    );
  }

  moveScene(sceneId: string, toIndex: number): ProjectCollections {
    if (!Number.isInteger(toIndex) || toIndex < 0 || toIndex >= this.scenes.length) {
      throw new Error(`Scene move target index is out of range: ${toIndex}.`);
    }

    const currentIndex = this.scenes.findIndex((scene) => scene.toSnapshot().sceneId === sceneId);

    if (currentIndex === -1) {
      throw new Error(`Scene does not exist: ${sceneId}.`);
    }

    const nextScenes = this.scenes.map((scene) => Scene.restore(scene.toSnapshot()));
    const [movedScene] = nextScenes.splice(currentIndex, 1);
    nextScenes.splice(toIndex, 0, movedScene);

    return new ProjectCollections(
      nextScenes,
      this.assets.map((asset) => Asset.restore(asset.toSnapshot())),
      this.characters.map((character) => CharacterModel.restore(character.toSnapshot())),
    );
  }

  updateScene(sceneId: string, updater: (scene: Scene) => void): ProjectCollections {
    let sceneWasUpdated = false;
    const nextScenes = this.scenes.map((scene) => {
      const nextScene = Scene.restore(scene.toSnapshot());

      if (nextScene.toSnapshot().sceneId === sceneId) {
        updater(nextScene);
        sceneWasUpdated = true;
      }

      return nextScene;
    });

    if (!sceneWasUpdated) {
      throw new Error(`Scene does not exist: ${sceneId}.`);
    }

    return new ProjectCollections(
      nextScenes,
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

  updateCharacterModel(characterId: string, updater: (character: CharacterModel) => void): ProjectCollections {
    let characterWasUpdated = false;
    const nextCharacters = this.characters.map((character) => {
      const nextCharacter = CharacterModel.restore(character.toSnapshot());

      if (nextCharacter.toSnapshot().characterId === characterId) {
        updater(nextCharacter);
        characterWasUpdated = true;
      }

      return nextCharacter;
    });

    if (!characterWasUpdated) {
      throw new Error(`Character does not exist: ${characterId}.`);
    }

    return new ProjectCollections(
      this.scenes.map((scene) => Scene.restore(scene.toSnapshot())),
      this.assets.map((asset) => Asset.restore(asset.toSnapshot())),
      nextCharacters,
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
