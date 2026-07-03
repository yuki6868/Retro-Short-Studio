import { CharacterImageMap, type CharacterImageMapSnapshot } from "./CharacterImageMap";
import type { CharacterVariantSnapshot } from "./CharacterVariant";
import { CharacterVariantSelection, type CharacterVariantSelectionSnapshot } from "./CharacterVariantSelection";
import {
  CharacterId,
  CharacterName,
  ExpressionState,
  EyeState,
  MotionState,
  MouthState,
} from "./valueObjects";

export type CharacterModelSnapshot = {
  characterId: string;
  characterName: string;
  defaultExpression: string;
  defaultEye: string;
  defaultMouth: string;
  defaultMotion: string;
  imageMap?: CharacterImageMapSnapshot;
  currentVariant?: CharacterVariantSelectionSnapshot;
};

export class CharacterModel {
  private constructor(
    private readonly id: CharacterId,
    private name: CharacterName,
    private defaultExpression: ExpressionState,
    private defaultEye: EyeState,
    private defaultMouth: MouthState,
    private defaultMotion: MotionState,
    private imageMap: CharacterImageMap,
    private currentVariant: CharacterVariantSelection | null,
  ) {}

  static create(params: {
    characterId: string;
    characterName: string;
    defaultExpression?: string;
    defaultEye?: string;
    defaultMouth?: string;
    defaultMotion?: string;
    imageMap?: Partial<CharacterImageMapSnapshot>;
  }): CharacterModel {
    return new CharacterModel(
      CharacterId.create(params.characterId),
      CharacterName.create(params.characterName),
      ExpressionState.create(params.defaultExpression),
      EyeState.create(params.defaultEye),
      MouthState.create(params.defaultMouth),
      MotionState.create(params.defaultMotion),
      CharacterImageMap.create(params.imageMap),
      null,
    );
  }

  static restore(snapshot: CharacterModelSnapshot): CharacterModel {
    const character = CharacterModel.create(snapshot);

    if (snapshot.currentVariant !== undefined) {
      character.changeVariantSelection(snapshot.currentVariant);
    }

    return character;
  }

  rename(characterName: string): void {
    this.name = CharacterName.create(characterName);
  }

  changeDefaultStates(params: {
    expression?: string;
    eye?: string;
    mouth?: string;
    motion?: string;
  }): void {
    if (params.expression !== undefined) {
      this.defaultExpression = ExpressionState.create(params.expression);
    }
    if (params.eye !== undefined) {
      this.defaultEye = EyeState.create(params.eye);
    }
    if (params.mouth !== undefined) {
      this.defaultMouth = MouthState.create(params.mouth);
    }
    if (params.motion !== undefined) {
      this.defaultMotion = MotionState.create(params.motion);
    }
  }

  changeVariantSelection(params: {
    expression?: string;
    eye?: string;
    mouth?: string;
  }): void {
    const current = this.currentVariant ?? CharacterVariantSelection.create({
      expression: this.defaultExpression.toString(),
      eye: this.defaultEye.toString(),
      mouth: this.defaultMouth.toString(),
    });

    this.currentVariant = current.change(params);
  }

  clearVariantSelection(): void {
    this.currentVariant = null;
  }

  resolveCurrentVariantSelection(): CharacterVariantSelectionSnapshot {
    return (this.currentVariant ?? CharacterVariantSelection.create({
      expression: this.defaultExpression.toString(),
      eye: this.defaultEye.toString(),
      mouth: this.defaultMouth.toString(),
    })).toSnapshot();
  }

  mapExpressionImage(expression: string, assetId: string): void {
    this.imageMap = this.imageMap.setExpressionImage(expression, assetId);
  }

  mapEyeImage(eye: string, assetId: string): void {
    this.imageMap = this.imageMap.setEyeImage(eye, assetId);
  }

  mapMouthImage(mouth: string, assetId: string): void {
    this.imageMap = this.imageMap.setMouthImage(mouth, assetId);
  }

  mapMotionImage(motion: string, assetId: string): void {
    this.imageMap = this.imageMap.setMotionImage(motion, assetId);
  }

  mapVariantImage(variant: Partial<CharacterVariantSnapshot>, assetId: string): void {
    this.imageMap = this.imageMap.setVariantImage(variant, assetId);
  }

  resolveDefaultVariantImage(): string | null {
    return this.imageMap.resolveVariant({
      expression: this.defaultExpression.toString(),
      eye: this.defaultEye.toString(),
      mouth: this.defaultMouth.toString(),
      motion: this.defaultMotion.toString(),
    });
  }

  resolveDefaultImages(): {
    expressionAssetId: string | null;
    eyeAssetId: string | null;
    mouthAssetId: string | null;
    motionAssetId: string | null;
  } {
    return this.imageMap.resolve({
      expression: this.defaultExpression.toString(),
      eye: this.defaultEye.toString(),
      mouth: this.defaultMouth.toString(),
      motion: this.defaultMotion.toString(),
    });
  }

  toSnapshot(): CharacterModelSnapshot {
    const currentVariant = this.currentVariant?.toSnapshot();

    return {
      characterId: this.id.toString(),
      characterName: this.name.toString(),
      defaultExpression: this.defaultExpression.toString(),
      defaultEye: this.defaultEye.toString(),
      defaultMouth: this.defaultMouth.toString(),
      defaultMotion: this.defaultMotion.toString(),
      imageMap: this.imageMap.toSnapshot(),
      ...(currentVariant === undefined ? {} : { currentVariant }),
    };
  }
}
