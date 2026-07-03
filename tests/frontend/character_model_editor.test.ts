import { describe, expect, it } from "vitest";

import { CharacterModelEditor, type CharacterModelEditorUseCase } from "../../frontend/src";
import type { CharacterModelEditorState } from "../../app/src";

describe("CharacterModelEditor", () => {
  it("renders default expression, mouth, and eye image slots", () => {
    const editor = new CharacterModelEditor({ characters: createUseCase(createState()) });

    const view = editor.render();

    expect(view.title).toBe("Character Model Editor");
    expect(view.selectedCharacter?.imageSlots.map((slot) => slot.label)).toEqual([
      "Default expression",
      "Mouth closed",
      "Mouth half",
      "Mouth open",
      "Eye open",
      "Eye closed",
    ]);
    expect(view.selectedCharacter?.imageSlots.find((slot) => slot.key === "mouth:open")?.assetId).toBe("asset-mouth-open");
  });

  it("delegates image map assignment to the use case", () => {
    const assignments: unknown[] = [];
    const editor = new CharacterModelEditor({
      characters: createUseCase(createState(), {
        assignImage: (input) => {
          assignments.push(input);
          return createState();
        },
      }),
    });

    editor.assignImage({ characterId: "character-zundamon", kind: "mouth", state: "open", assetId: "asset-mouth-open" });

    expect(assignments).toEqual([
      { characterId: "character-zundamon", kind: "mouth", state: "open", assetId: "asset-mouth-open" },
    ]);
  });
});

function createState(): CharacterModelEditorState {
  return {
    selectedCharacterId: "character-zundamon",
    characterImageAssets: [
      { assetId: "asset-neutral", assetName: "Neutral", assetType: "character_image", assetPath: "assets/characters/neutral.png" },
      { assetId: "asset-mouth-open", assetName: "Mouth open", assetType: "character_image", assetPath: "assets/characters/mouth-open.png" },
    ],
    characters: [
      {
        characterId: "character-zundamon",
        characterName: "Zundamon",
        defaultExpression: "neutral",
        defaultEye: "open",
        defaultMouth: "closed",
        defaultMotion: "idle",
        imageMap: {
          expression: { neutral: "asset-neutral" },
          mouth: { open: "asset-mouth-open" },
          eye: {},
          motion: {},
        },
        selected: true,
      },
    ],
  };
}

function createUseCase(
  state: CharacterModelEditorState,
  overrides: Partial<CharacterModelEditorUseCase> = {},
): CharacterModelEditorUseCase {
  return {
    get state() {
      return state;
    },
    createCharacterModel: overrides.createCharacterModel ?? (() => state),
    selectCharacter: overrides.selectCharacter ?? (() => state),
    renameCharacter: overrides.renameCharacter ?? (() => state),
    changeDefaults: overrides.changeDefaults ?? (() => state),
    assignImage: overrides.assignImage ?? (() => state),
  };
}
