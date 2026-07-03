import { assertNonEmptyString } from "../validation";

export type PixelCanvasSize = 16 | 32 | 64;

export type PixelDocumentSnapshot = {
  documentId: string;
  projectId: string;
  width: PixelCanvasSize;
  height: PixelCanvasSize;
  pixels: string[];
};

const SUPPORTED_CANVAS_SIZES = new Set<number>([16, 32, 64]);
const TRANSPARENT_PIXEL = "transparent";

export class PixelDocument {
  private constructor(
    private readonly documentId: string,
    private readonly projectId: string,
    private readonly width: PixelCanvasSize,
    private readonly height: PixelCanvasSize,
    private readonly pixels: string[],
  ) {}

  static create(params: { documentId: string; projectId: string; size: PixelCanvasSize; fillColor?: string }): PixelDocument {
    const documentId = validateRequiredText("PixelDocument documentId", params.documentId);
    const projectId = validateRequiredText("PixelDocument projectId", params.projectId);
    validateCanvasSize(params.size);
    const fillColor = normalizePixelColor(params.fillColor ?? TRANSPARENT_PIXEL);

    return new PixelDocument(documentId, projectId, params.size, params.size, Array(params.size * params.size).fill(fillColor));
  }

  static restore(snapshot: PixelDocumentSnapshot): PixelDocument {
    const documentId = validateRequiredText("PixelDocument documentId", snapshot.documentId);
    const projectId = validateRequiredText("PixelDocument projectId", snapshot.projectId);
    validateCanvasSize(snapshot.width);
    validateCanvasSize(snapshot.height);

    if (snapshot.width !== snapshot.height) {
      throw new Error("PixelDocument width and height must be the same canvas size.");
    }

    if (snapshot.pixels.length !== snapshot.width * snapshot.height) {
      throw new Error("PixelDocument pixels length must match width * height.");
    }

    return new PixelDocument(
      documentId,
      projectId,
      snapshot.width,
      snapshot.height,
      snapshot.pixels.map((pixel) => normalizePixelColor(pixel)),
    );
  }

  paintPixel(x: number, y: number, color: string): PixelDocument {
    this.assertPointInCanvas(x, y);
    const pixels = [...this.pixels];
    pixels[y * this.width + x] = normalizePixelColor(color);
    return new PixelDocument(this.documentId, this.projectId, this.width, this.height, pixels);
  }

  clearPixel(x: number, y: number): PixelDocument {
    return this.paintPixel(x, y, TRANSPARENT_PIXEL);
  }

  resize(size: PixelCanvasSize): PixelDocument {
    validateCanvasSize(size);
    const pixels = Array(size * size).fill(TRANSPARENT_PIXEL);
    const copyWidth = Math.min(this.width, size);
    const copyHeight = Math.min(this.height, size);

    for (let y = 0; y < copyHeight; y += 1) {
      for (let x = 0; x < copyWidth; x += 1) {
        pixels[y * size + x] = this.pixels[y * this.width + x];
      }
    }

    return new PixelDocument(this.documentId, this.projectId, size, size, pixels);
  }

  toSnapshot(): PixelDocumentSnapshot {
    return {
      documentId: this.documentId,
      projectId: this.projectId,
      width: this.width,
      height: this.height,
      pixels: [...this.pixels],
    };
  }

  private assertPointInCanvas(x: number, y: number): void {
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      throw new Error("PixelDocument coordinates must be integers.");
    }

    if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
      throw new Error("PixelDocument coordinates are outside the canvas.");
    }
  }
}

function validateCanvasSize(size: number): asserts size is PixelCanvasSize {
  if (!SUPPORTED_CANVAS_SIZES.has(size)) {
    throw new Error("PixelDocument canvas size must be 16, 32, or 64.");
  }
}

function validateRequiredText(label: string, value: string): string {
  return assertNonEmptyString(value, label);
}

function normalizePixelColor(color: string): string {
  const value = color.trim();

  if (value === TRANSPARENT_PIXEL) {
    return value;
  }

  if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
    throw new Error("PixelDocument pixel color must be transparent or a #RRGGBB value.");
  }

  return value.toUpperCase();
}
