export type DrawableKind = "background" | "character" | "effect" | "shape" | "image";

export type DrawableTransform = {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  opacity: number;
};

export type Drawable = {
  drawableId: string;
  kind: DrawableKind;
  assetId: string | null;
  layer: number;
  transform: DrawableTransform;
  payload: Record<string, unknown>;
};

export function createDefaultDrawableTransform(): DrawableTransform {
  return {
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    opacity: 1,
  };
}
