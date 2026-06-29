import { assertFiniteNumber, assertPositiveFiniteNumber } from "../../validation";

export type TransformValues = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

export class Transform {
  private constructor(private readonly values: TransformValues) {}

  static create(values: TransformValues): Transform {
    return new Transform({
      x: assertFiniteNumber(values.x, "Transform.x"),
      y: assertFiniteNumber(values.y, "Transform.y"),
      scale: assertPositiveFiniteNumber(values.scale, "Transform.scale"),
      rotation: assertFiniteNumber(values.rotation, "Transform.rotation"),
    });
  }

  static default(): Transform {
    return Transform.create({ x: 0, y: 0, scale: 1, rotation: 0 });
  }

  toValues(): TransformValues {
    return { ...this.values };
  }
}
