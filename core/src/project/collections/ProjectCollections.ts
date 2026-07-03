import { Asset, type AssetSnapshot } from "../../asset";
import { CharacterModel, type CharacterModelSnapshot } from "../../character";
import { Scene, type SceneSnapshot } from "../../scene";
import { SceneTemplate, type SceneTemplateSnapshot } from "../../template/SceneTemplate";

export type ProjectCollectionsSnapshot = {
  scenes: SceneSnapshot[];
  assets: AssetSnapshot[];
  characters: CharacterModelSnapshot[];
  sceneTemplates?: SceneTemplateSnapshot[];
};

export class ProjectCollections {
  private constructor(
    private readonly scenes: Scene[],
    private readonly assets: Asset[],
    private readonly characters: CharacterModel[],
    private readonly sceneTemplates: SceneTemplate[],
  ) {}

  static empty(): ProjectCollections {
    return new ProjectCollections([], [], [], []);
  }

  static fromSnapshot(snapshot: ProjectCollectionsSnapshot): ProjectCollections {
    return new ProjectCollections(
      snapshot.scenes.map((scene) => Scene.restore(scene)),
      snapshot.assets.map((asset) => Asset.restore(asset)),
      snapshot.characters.map((character) => CharacterModel.restore(character)),
      (snapshot.sceneTemplates ?? []).map((template) => SceneTemplate.restore(template)),
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
      this.sceneTemplates.map((template) => SceneTemplate.restore(template.toSnapshot())),
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
      this.sceneTemplates.map((template) => SceneTemplate.restore(template.toSnapshot())),
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
      this.sceneTemplates.map((template) => SceneTemplate.restore(template.toSnapshot())),
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
      this.sceneTemplates.map((template) => SceneTemplate.restore(template.toSnapshot())),
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
      this.sceneTemplates.map((template) => SceneTemplate.restore(template.toSnapshot())),
    );
  }

  removeAsset(assetId: string): ProjectCollections {
    if (!this.assets.some((asset) => asset.toSnapshot().assetId === assetId)) {
      throw new Error(`Asset does not exist: ${assetId}.`);
    }

    return new ProjectCollections(
      this.scenes.map((scene) => {
        const nextScene = Scene.restore(scene.toSnapshot());

        if (nextScene.toSnapshot().backgroundAssetId === assetId) {
          nextScene.changeBackground(null);
        }

        return nextScene;
      }),
      this.assets
        .filter((asset) => asset.toSnapshot().assetId !== assetId)
        .map((asset) => Asset.restore(asset.toSnapshot())),
      this.characters.map((character) => CharacterModel.restore(character.toSnapshot())),
      this.sceneTemplates.map((template) => SceneTemplate.restore(template.toSnapshot())),
    );
  }

  updateAsset(assetId: string, updater: (asset: Asset) => void): ProjectCollections {
    let assetWasUpdated = false;
    const nextAssets = this.assets.map((asset) => {
      const nextAsset = Asset.restore(asset.toSnapshot());

      if (nextAsset.toSnapshot().assetId === assetId) {
        updater(nextAsset);
        assetWasUpdated = true;
      }

      return nextAsset;
    });

    if (!assetWasUpdated) {
      throw new Error(`Asset does not exist: ${assetId}.`);
    }

    return new ProjectCollections(
      this.scenes.map((scene) => Scene.restore(scene.toSnapshot())),
      nextAssets,
      this.characters.map((character) => CharacterModel.restore(character.toSnapshot())),
      this.sceneTemplates.map((template) => SceneTemplate.restore(template.toSnapshot())),
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
      this.sceneTemplates.map((template) => SceneTemplate.restore(template.toSnapshot())),
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
      this.sceneTemplates.map((template) => SceneTemplate.restore(template.toSnapshot())),
    );
  }


  addSceneTemplate(template: SceneTemplate): ProjectCollections {
    const templateId = template.toSnapshot().templateId;

    if (this.sceneTemplates.some((currentTemplate) => currentTemplate.toSnapshot().templateId === templateId)) {
      throw new Error(`SceneTemplate already exists: ${templateId}.`);
    }

    return new ProjectCollections(
      this.scenes.map((scene) => Scene.restore(scene.toSnapshot())),
      this.assets.map((asset) => Asset.restore(asset.toSnapshot())),
      this.characters.map((character) => CharacterModel.restore(character.toSnapshot())),
      [...this.sceneTemplates, SceneTemplate.restore(template.toSnapshot())],
    );
  }

  removeSceneTemplate(templateId: string): ProjectCollections {
    if (!this.sceneTemplates.some((template) => template.toSnapshot().templateId === templateId)) {
      throw new Error(`SceneTemplate does not exist: ${templateId}.`);
    }

    return new ProjectCollections(
      this.scenes.map((scene) => Scene.restore(scene.toSnapshot())),
      this.assets.map((asset) => Asset.restore(asset.toSnapshot())),
      this.characters.map((character) => CharacterModel.restore(character.toSnapshot())),
      this.sceneTemplates
        .filter((template) => template.toSnapshot().templateId !== templateId)
        .map((template) => SceneTemplate.restore(template.toSnapshot())),
    );
  }

  toSnapshot(): ProjectCollectionsSnapshot {
    return {
      scenes: this.scenes.map((scene) => scene.toSnapshot()),
      assets: this.assets.map((asset) => asset.toSnapshot()),
      characters: this.characters.map((character) => character.toSnapshot()),
      sceneTemplates: this.sceneTemplates.map((template) => template.toSnapshot()),
    };
  }
}
