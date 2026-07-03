export type PaletteSnapshot = {
  colors: string[];
  selectedColor: string;
};

const DEFAULT_COLORS = [
  "#000000",
  "#FFFFFF",
  "#FF004D",
  "#FFA300",
  "#FFEC27",
  "#00E436",
  "#29ADFF",
  "#83769C",
];

export class Palette {
  private constructor(
    private readonly colors: string[],
    private readonly selectedColor: string,
  ) {}

  static createDefault(): Palette {
    return new Palette(DEFAULT_COLORS, DEFAULT_COLORS[0]);
  }

  static restore(snapshot: PaletteSnapshot): Palette {
    if (snapshot.colors.length === 0) {
      throw new Error("Palette must have at least one color.");
    }

    const colors = snapshot.colors.map((color) => normalizePaletteColor(color));
    const selectedColor = normalizePaletteColor(snapshot.selectedColor);

    if (!colors.includes(selectedColor)) {
      throw new Error("Palette selected color must exist in colors.");
    }

    return new Palette(colors, selectedColor);
  }

  selectColor(color: string): Palette {
    const selectedColor = normalizePaletteColor(color);

    if (!this.colors.includes(selectedColor)) {
      throw new Error("Palette selected color must exist in colors.");
    }

    return new Palette(this.colors, selectedColor);
  }

  toSnapshot(): PaletteSnapshot {
    return {
      colors: [...this.colors],
      selectedColor: this.selectedColor,
    };
  }
}

function normalizePaletteColor(color: string): string {
  const value = color.trim();

  if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
    throw new Error("Palette color must be a #RRGGBB value.");
  }

  return value.toUpperCase();
}