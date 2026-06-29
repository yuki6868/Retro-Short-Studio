import { CharacterInstance, type CharacterInstanceSnapshot } from "../character";
import { Background, Duration, SceneId, SceneName } from "./valueObjects";

export type SceneActionRef = {
  actionId: string;
};

export type SceneSnapshot = {
  sceneId: string;
  sceneName: string;
  duration: number;
  backgroundAssetId: string | null;
  characters: CharacterInstanceSnapshot[];
  actions: SceneActionRef[];
};

export class Scene {
  private constructor(
    private readonly id: SceneId,
    private name: SceneName,
    private duration: Duration,
    private background: Background,
    private readonly characters: CharacterInstance[],
    private readonly actions: SceneActionRef[],
  ) {}

  static create(params: {
    sceneId: string;
    sceneName: string;
    duration: number;
    backgroundAssetId?: string | null;
    characters?: CharacterInstanceSnapshot[];
    actions?: SceneActionRef[];
  }): Scene {
    return new Scene(
      SceneId.create(params.sceneId),
      SceneName.create(params.sceneName),
      Duration.create(params.duration),
      Background.create(params.backgroundAssetId ?? null),
      copyCharacterInstances(params.characters ?? []),
      copyActionRefs(params.actions ?? []),
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

  toSnapshot(): SceneSnapshot {
    return {
      sceneId: this.id.toString(),
      sceneName: this.name.toString(),
      duration: this.duration.toNumber(),
      ...this.background.toSnapshot(),
      characters: this.characters.map((character) => character.toSnapshot()),
      actions: copyActionRefs(this.actions),
    };
  }
}

function copyCharacterInstances(characters: CharacterInstanceSnapshot[]): CharacterInstance[] {
  return characters.map((character) => CharacterInstance.restore(character));
}

function copyActionRefs(actions: SceneActionRef[]): SceneActionRef[] {
  return actions.map((action) => ({ actionId: normalizeRefId(action.actionId, "Scene action id") }));
}

function normalizeRefId(value: string, label: string): string {
  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    throw new Error(`${label} is required.`);
  }

  return normalizedValue;
}
