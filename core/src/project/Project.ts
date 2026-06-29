import { Asset } from "../asset";
import { CharacterModel } from "../character";
import { Scene } from "../scene";
import { ProjectCollections, type ProjectCollectionsSnapshot } from "./collections";
import { ProjectId, ProjectName, ProjectSettings, type ProjectSettingsValues } from "./valueObjects";

export type ProjectSnapshot = {
  projectId: string;
  projectName: string;
  settings: ProjectSettingsValues;
} & ProjectCollectionsSnapshot;

export class Project {
  private constructor(
    private readonly id: ProjectId,
    private name: ProjectName,
    private settings: ProjectSettings,
    private collections: ProjectCollections,
  ) {}

  static create(params: {
    projectId: string;
    projectName: string;
    settings?: ProjectSettingsValues;
  }): Project {
    return new Project(
      ProjectId.create(params.projectId),
      ProjectName.create(params.projectName),
      params.settings
        ? ProjectSettings.create(params.settings)
        : ProjectSettings.defaultVerticalShort(),
      ProjectCollections.empty(),
    );
  }

  static restore(snapshot: ProjectSnapshot): Project {
    return new Project(
      ProjectId.create(snapshot.projectId),
      ProjectName.create(snapshot.projectName),
      ProjectSettings.create(snapshot.settings),
      ProjectCollections.fromSnapshot({
        scenes: snapshot.scenes,
        assets: snapshot.assets,
        characters: snapshot.characters,
      }),
    );
  }

  rename(projectName: string): void {
    this.name = ProjectName.create(projectName);
  }

  changeSettings(settings: ProjectSettingsValues): void {
    this.settings = ProjectSettings.create(settings);
  }

  addScene(scene: Scene): void {
    this.collections = this.collections.addScene(scene);
  }

  removeScene(sceneId: string): void {
    this.collections = this.collections.removeScene(sceneId);
  }

  moveScene(sceneId: string, toIndex: number): void {
    this.collections = this.collections.moveScene(sceneId, toIndex);
  }

  updateScene(sceneId: string, updater: (scene: Scene) => void): void {
    this.collections = this.collections.updateScene(sceneId, updater);
  }

  addAsset(asset: Asset): void {
    this.collections = this.collections.addAsset(asset);
  }

  addCharacterModel(character: CharacterModel): void {
    this.collections = this.collections.addCharacterModel(character);
  }

  updateCharacterModel(characterId: string, updater: (character: CharacterModel) => void): void {
    this.collections = this.collections.updateCharacterModel(characterId, updater);
  }

  toSnapshot(): ProjectSnapshot {
    return {
      projectId: this.id.toString(),
      projectName: this.name.toString(),
      settings: this.settings.toValues(),
      ...this.collections.toSnapshot(),
    };
  }
}
