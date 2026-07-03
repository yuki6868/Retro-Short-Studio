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



  it("renders the current preview variant separately from defaults", () => {
    const editor = new CharacterModelEditor({ characters: createUseCase(createState({ currentVariant: { expression: "happy", eye: "closed", mouth: "open" } })) });

    const view = editor.render();

    expect(view.selectedCharacter?.defaultExpression).toBe("neutral");
    expect(view.selectedCharacter?.previewVariant).toEqual({ expression: "happy", eye: "closed", mouth: "open" });
  });

  it("delegates preview variant selection changes to the use case", () => {
    const changes: unknown[] = [];
    const editor = new CharacterModelEditor({
      characters: createUseCase(createState(), {
        changeVariantSelection: (input) => {
          changes.push(input);
          return createState({ currentVariant: { expression: "angry", eye: "closed", mouth: "half" } });
        },
      }),
    });

    const view = editor.changeVariantSelection({
      characterId: "character-zundamon",
      expression: "angry",
      eye: "closed",
      mouth: "half",
    });

    expect(changes).toEqual([
      { characterId: "character-zundamon", expression: "angry", eye: "closed", mouth: "half" },
    ]);
    expect(view.selectedCharacter?.previewVariant).toEqual({ expression: "angry", eye: "closed", mouth: "half" });
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

function createState(input: { currentVariant?: CharacterModelEditorState["characters"][number]["currentVariant"] } = {}): CharacterModelEditorState {
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
        ...(input.currentVariant === undefined ? {} : { currentVariant: input.currentVariant }),
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
    changeVariantSelection: overrides.changeVariantSelection ?? (() => state),
    assignImage: overrides.assignImage ?? (() => state),
  };
}
