import { describe, expect, it } from "vitest";

import { assertFiniteNumber, assertNonEmptyString, assertPositiveFiniteNumber, assertPositiveInteger } from "../../core/src";

describe("Domain Validation Core", () => {
  it("normalizes required strings", () => {
    expect(assertNonEmptyString("  value  ", "Name")).toBe("value");
    expect(() => assertNonEmptyString("   ", "Name")).toThrow("Name is required.");
  });

  it("guards numeric domain values", () => {
    expect(assertFiniteNumber(0, "x")).toBe(0);
    expect(assertPositiveFiniteNumber(0.5, "duration")).toBe(0.5);
    expect(assertPositiveInteger(1, "fps")).toBe(1);
    expect(() => assertFiniteNumber(Number.POSITIVE_INFINITY, "x")).toThrow("x must be a finite number.");
    expect(() => assertPositiveFiniteNumber(0, "duration")).toThrow("duration must be a positive finite number.");
    expect(() => assertPositiveInteger(1.5, "fps")).toThrow("fps must be a positive integer.");
  });
});
