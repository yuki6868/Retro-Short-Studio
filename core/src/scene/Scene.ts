import { Action, type ActionSnapshot } from "../action";
import { CharacterInstance, type CharacterInstanceSnapshot } from "../character";
import { Background, Duration, SceneId, SceneName } from "./valueObjects";

export type SceneSnapshot = {
  sceneId: string;
  sceneName: string;
  duration: number;
  backgroundAssetId: string | null;
  characters: CharacterInstanceSnapshot[];
  actions: ActionSnapshot[];
};

export class Scene {
  private constructor(
    private readonly id: SceneId,
    private name: SceneName,
    private duration: Duration,
    private background: Background,
    private readonly characters: CharacterInstance[],
    private readonly actions: Action[],
  ) {}

  static create(params: {
    sceneId: string;
    sceneName: string;
    duration: number;
    backgroundAssetId?: string | null;
    characters?: CharacterInstanceSnapshot[];
    actions?: ActionSnapshot[];
  }): Scene {
    return new Scene(
      SceneId.create(params.sceneId),
      SceneName.create(params.sceneName),
      Duration.create(params.duration),
      Background.create(params.backgroundAssetId ?? null),
      copyCharacterInstances(params.characters ?? []),
      copyActions(params.actions ?? []),
    );
  }

  static restore(snapshot: SceneSnapshot): Scene {
    return Scene.create(snapshot);
  }

  rename(sceneName: string): void {
    this.name = SceneName.create(sceneName);
  }

  changeDuration(duration: number): void {
    this.duration = Duration.create(duration);
  }

  changeBackground(backgroundAssetId: string | null): void {
    this.background = Background.create(backgroundAssetId);
  }

  addAction(action: Action): void {
    const actionId = action.toSnapshot().actionId;

    if (this.actions.some((currentAction) => currentAction.toSnapshot().actionId === actionId)) {
      throw new Error(`Action already exists in scene: ${actionId}.`);
    }

    this.actions.push(Action.restore(action.toSnapshot()));
  }

  toSnapshot(): SceneSnapshot {
    return {
      sceneId: this.id.toString(),
      sceneName: this.name.toString(),
      duration: this.duration.toNumber(),
      ...this.background.toSnapshot(),
      characters: this.characters.map((character) => character.toSnapshot()),
      actions: this.actions.map((action) => action.toSnapshot()),
    };
  }
}

function copyCharacterInstances(characters: CharacterInstanceSnapshot[]): CharacterInstance[] {
  return characters.map((character) => CharacterInstance.restore(character));
}

function copyActions(actions: ActionSnapshot[]): Action[] {
  return actions.map((action) => Action.restore(action));
}
