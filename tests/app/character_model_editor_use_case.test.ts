import { describe, expect, it } from "vitest";

import { Asset, DeterministicIdGenerator, Project } from "../../core/src";
import { CharacterModelEditorUseCase } from "../../app/src";

function createUseCase(): { project: Project; useCase: CharacterModelEditorUseCase } {
  const project = Project.create({ projectId: "project-1", projectName: "Opening Short" });
  const useCase = new CharacterModelEditorUseCase({ project, idGenerator: new DeterministicIdGenerator() });
  return { project, useCase };
}

describe("CharacterModelEditorUseCase", () => {
  it("creates a CharacterModel and selects it", () => {
    const { project, useCase } = createUseCase();

    const state = useCase.createCharacterModel({ characterName: "Zundamon" });

    expect(state.selectedCharacterId).toBe("character-1");
    expect(state.characters[0]).toMatchObject({
      characterId: "character-1",
      characterName: "Zundamon",
      defaultExpression: "neutral",
      defaultEye: "open",
      defaultMouth: "closed",
      defaultMotion: "idle",
      selected: true,
    });
    expect(project.toSnapshot().characters[0]?.characterName).toBe("Zundamon");
  });

  it("assigns expression, mouth, and eye images from character_image assets", () => {
    const { project, useCase } = createUseCase();
    project.addAsset(Asset.create({ assetId: "asset-neutral", assetName: "Neutral", assetType: "character_image", assetPath: "assets/characters/zunda/neutral.png" }));
    project.addAsset(Asset.create({ assetId: "asset-mouth-open", assetName: "Mouth open", assetType: "character_image", assetPath: "assets/characters/zunda/mouth-open.png" }));
    project.addAsset(Asset.create({ assetId: "asset-eye-closed", assetName: "Eye closed", assetType: "character_image", assetPath: "assets/characters/zunda/eye-closed.png" }));
    useCase.createCharacterModel({ characterName: "Zundamon" });

    useCase.assignImage({ characterId: "character-1", kind: "expression", state: "neutral", assetId: "asset-neutral" });
    useCase.assignImage({ characterId: "character-1", kind: "mouth", state: "open", assetId: "asset-mouth-open" });
    const state = useCase.assignImage({ characterId: "character-1", kind: "eye", state: "closed", assetId: "asset-eye-closed" });

    expect(state.characterImageAssets.map((asset) => asset.assetId)).toEqual(["asset-neutral", "asset-mouth-open", "asset-eye-closed"]);
    expect(project.toSnapshot().characters[0]?.imageMap).toEqual({
      expression: { neutral: "asset-neutral" },
      mouth: { open: "asset-mouth-open" },
      eye: { closed: "asset-eye-closed" },
      motion: {},
    });
  });

  it("rejects mapping a background asset as a character image", () => {
    const { project, useCase } = createUseCase();
    project.addAsset(Asset.create({ assetId: "asset-bg", assetName: "Room", assetType: "background", assetPath: "assets/backgrounds/room.png" }));
    useCase.createCharacterModel({ characterName: "Zundamon" });

    expect(() =>
      useCase.assignImage({ characterId: "character-1", kind: "expression", state: "neutral", assetId: "asset-bg" }),
    ).toThrow("Character image map must reference a character_image asset: asset-bg.");
  });
});
