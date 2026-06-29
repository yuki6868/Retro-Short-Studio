import { describe, expect, it } from "vitest";

import { CharacterId, CharacterInstanceId, CryptoRandomIdGenerator, DeterministicIdGenerator } from "../../core/src";

describe("Identity Core", () => {
  it("generates deterministic ids for tests and sample data", () => {
    const generator = new DeterministicIdGenerator();

    expect(generator.generate("scene")).toBe("scene-1");
    expect(generator.generate("scene")).toBe("scene-2");
  });

  it("lets entity id value objects generate through an injected generator", () => {
    const generator = new DeterministicIdGenerator();

    expect(CharacterId.generate(generator).toString()).toBe("character-1");
    expect(CharacterInstanceId.generate(generator).toString()).toBe("character-instance-2");
  });

  it("rejects blank id prefixes", () => {
    expect(() => new DeterministicIdGenerator().generate("   ")).toThrow("Id prefix is required.");
  });

  it("provides a crypto based production generator", () => {
    const id = new CryptoRandomIdGenerator().generate("project");

    expect(id).toMatch(/^project_[0-9a-f-]{36}$/);
  });
});
