export type BackgroundSnapshot = {
  backgroundAssetId: string | null;
};

export class Background {
  private constructor(private readonly backgroundAssetId: string | null) {}

  static none(): Background {
    return new Background(null);
  }

  static create(backgroundAssetId: string | null): Background {
    if (backgroundAssetId === null) {
      return Background.none();
    }

    const normalizedValue = backgroundAssetId.trim();

    if (normalizedValue.length === 0) {
      throw new Error("Background asset id must be a non-empty string or null.");
    }

    return new Background(normalizedValue);
  }

  toSnapshot(): BackgroundSnapshot {
    return { backgroundAssetId: this.backgroundAssetId };
  }
}
