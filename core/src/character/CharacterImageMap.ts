import { AssetId } from "../asset";
import { CharacterVariant, type CharacterVariantSnapshot } from "./CharacterVariant";
import { CharacterVariantSelection, type CharacterVariantSelectionSnapshot } from "./CharacterVariantSelection";
import { ExpressionState, EyeState, MotionState, MouthState } from "./valueObjects";

export type CharacterImageMapSnapshot = {
  expression: Record<string, string>;
  eye: Record<string, string>;
  mouth: Record<string, string>;
  motion: Record<string, string>;
  variant?: Record<string, string>;
};

export type CharacterImageMapStateKind = "expression" | "eye" | "mouth" | "motion";

export type CharacterImageMapResolvedSnapshot = {
  expressionAssetId: string | null;
  eyeAssetId: string | null;
  mouthAssetId: string | null;
  motionAssetId: string | null;
};

export type CharacterImageMapStateValues = {
  expression: string;
  eye: string;
  mouth: string;
  motion: string;
};

export type CharacterImageMapFindAssetInput = {
  selection: CharacterVariantSelectionSnapshot;
  motion?: string;
};

export class CharacterImageMap {
  private constructor(
    private readonly expression: Map<string, AssetId>,
    private readonly eye: Map<string, AssetId>,
    private readonly mouth: Map<string, AssetId>,
    private readonly motion: Map<string, AssetId>,
    private readonly variant: Map<string, AssetId>,
  ) {}

  static empty(): CharacterImageMap {
    return new CharacterImageMap(new Map(), new Map(), new Map(), new Map(), new Map());
  }

  static create(snapshot: Partial<CharacterImageMapSnapshot> = {}): CharacterImageMap {
    return new CharacterImageMap(
      restoreMap(snapshot.expression ?? {}, "expression"),
      restoreMap(snapshot.eye ?? {}, "eye"),
      restoreMap(snapshot.mouth ?? {}, "mouth"),
      restoreMap(snapshot.motion ?? {}, "motion"),
      restoreVariantMap(snapshot.variant ?? {}),
    );
  }

  static restore(snapshot: CharacterImageMapSnapshot): CharacterImageMap {
    return CharacterImageMap.create(snapshot);
  }

  setExpressionImage(expression: string, assetId: string): CharacterImageMap {
    return this.setImage("expression", expression, assetId);
  }

  setEyeImage(eye: string, assetId: string): CharacterImageMap {
    return this.setImage("eye", eye, assetId);
  }

  setMouthImage(mouth: string, assetId: string): CharacterImageMap {
    return this.setImage("mouth", mouth, assetId);
  }

  setMotionImage(motion: string, assetId: string): CharacterImageMap {
    return this.setImage("motion", motion, assetId);
  }

  setVariantImage(variant: Partial<CharacterVariantSnapshot>, assetId: string): CharacterImageMap {
    const normalizedVariant = CharacterVariant.create(variant);
    const normalizedAssetId = AssetId.create(assetId);
    const snapshot = this.toSnapshot();

    return CharacterImageMap.create({
      ...snapshot,
      variant: {
        ...(snapshot.variant ?? {}),
        [normalizedVariant.toKey()]: normalizedAssetId.toString(),
      },
    });
  }

  setImage(kind: CharacterImageMapStateKind, state: string, assetId: string): CharacterImageMap {
    const normalizedState = normalizeState(kind, state);
    const normalizedAssetId = AssetId.create(assetId);
    const snapshot = this.toSnapshot();

    snapshot[kind] = {
      ...snapshot[kind],
      [normalizedState]: normalizedAssetId.toString(),
    };

    return CharacterImageMap.create(snapshot);
  }

  getImage(kind: CharacterImageMapStateKind, state: string): string | null {
    const normalizedState = normalizeState(kind, state);
    return this.mapByKind(kind).get(normalizedState)?.toString() ?? null;
  }

  findAsset(input: CharacterImageMapFindAssetInput): string | null {
    const selection = CharacterVariantSelection.restore(input.selection).toSnapshot();
    const motion = MotionState.create(input.motion).toString();

    const variantAssetId = this.resolveVariant({
      expression: selection.expression,
      eye: selection.eye,
      mouth: selection.mouth,
      motion,
    });

    return (
      variantAssetId ??
      this.getImage("expression", selection.expression) ??
      this.getImage("mouth", selection.mouth) ??
      this.getImage("eye", selection.eye) ??
      this.getImage("motion", motion)
    );
  }

  resolve(states: CharacterImageMapStateValues): CharacterImageMapResolvedSnapshot {
    return {
      expressionAssetId: this.getImage("expression", states.expression),
      eyeAssetId: this.getImage("eye", states.eye),
      mouthAssetId: this.getImage("mouth", states.mouth),
      motionAssetId: this.getImage("motion", states.motion),
    };
  }

  resolveVariant(states: CharacterImageMapStateValues): string | null {
    const key = CharacterVariant.fromStateValues(states).toKey();
    return this.variant.get(key)?.toString() ?? null;
  }

  toSnapshot(): CharacterImageMapSnapshot {
    const variant = mapToSnapshot(this.variant);

    return {
      expression: mapToSnapshot(this.expression),
      eye: mapToSnapshot(this.eye),
      mouth: mapToSnapshot(this.mouth),
      motion: mapToSnapshot(this.motion),
      ...(Object.keys(variant).length === 0 ? {} : { variant }),
    };
  }

  private mapByKind(kind: CharacterImageMapStateKind): Map<string, AssetId> {
    switch (kind) {
      case "expression":
        return this.expression;
      case "eye":
        return this.eye;
      case "mouth":
        return this.mouth;
      case "motion":
        return this.motion;
    }
  }
}

function restoreMap(values: Record<string, string>, kind: CharacterImageMapStateKind): Map<string, AssetId> {
  return new Map(Object.entries(values).map(([state, assetId]) => [normalizeState(kind, state), AssetId.create(assetId)]));
}

function restoreVariantMap(values: Record<string, string>): Map<string, AssetId> {
  return new Map(Object.entries(values).map(([variantKey, assetId]) => [assertVariantKey(variantKey), AssetId.create(assetId)]));
}

function mapToSnapshot(values: Map<string, AssetId>): Record<string, string> {
  return Object.fromEntries([...values.entries()].map(([state, assetId]) => [state, assetId.toString()]));
}

function assertVariantKey(variantKey: string): string {
  const normalized = variantKey.trim();

  if (normalized.length === 0) {
    throw new Error("CharacterVariant key is required.");
  }

  return normalized;
}

function normalizeState(kind: CharacterImageMapStateKind, state: string): string {
  switch (kind) {
    case "expression":
      return ExpressionState.create(state).toString();
    case "eye":
      return EyeState.create(state).toString();
    case "mouth":
      return MouthState.create(state).toString();
    case "motion":
      return MotionState.create(state).toString();
  }
}