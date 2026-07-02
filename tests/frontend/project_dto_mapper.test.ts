import { describe, expect, it } from "vitest";

import { Action, Asset, CharacterInstance, CharacterModel, Project, Scene } from "../../core/src";
import { projectSnapshotToProjectDto } from "../../frontend/src/react";
import { ProjectJsonSerializer } from "../../storage/src";

function createProjectWithSceneCharacters(): Project {
  const project = Project.create({
    projectId: "project-mapper-test",
    projectName: "Mapper Test",
    settings: { width: 1280, height: 720, fps: 30 },
  });

  project.addAsset(
    Asset.create({
      assetId: "asset-bg",
      assetName: "Background",
      assetType: "background",
      assetPath: "assets/backgrounds/bg.png",
    }),
  );
  project.addCharacterModel(
    CharacterModel.create({
      characterId: "character-zundamon",
      characterName: "Zundamon",
    }),
  );
  project.addScene(
    Scene.create({
      sceneId: "scene-opening",
      sceneName: "Opening",
      duration: 8,
      backgroundAssetId: "asset-bg",
      characters: [
        CharacterInstance.create({
          instanceId: "character-instance-1",
          characterId: "character-zundamon",
        }).toSnapshot(),
      ],
      actions: [
        Action.create({
          actionId: "action-talk-opening",
          actionType: "talk",
          startTime: 0.5,
          endTime: 2.5,
          targetId: "character-zundamon",
          payload: {
            text: "保存するのだ。",
            speakerId: "3",
            speakerCharacterId: "character-zundamon",
            voiceAssetId: null,
            generatedVoicePath: null,
            generatedVoiceDuration: null,
            lipSyncEnabled: true,
          },
        }).toSnapshot(),
      ],
    }),
  );

  return project;
}

describe("projectSnapshotToProjectDto", () => {
  it("converts core scene character instances to ProjectDto.characterIds before serialization", () => {
    const project = createProjectWithSceneCharacters();
    const dto = projectSnapshotToProjectDto(project.toSnapshot());

    expect(dto.scenes[0]?.characterIds).toEqual(["character-zundamon"]);
    expect("characters" in (dto.scenes[0] as Record<string, unknown>)).toBe(false);
    expect(() => new ProjectJsonSerializer().serialize(dto)).not.toThrow();
  });

  it("serializes scenes without character instances as an empty characterIds array", () => {
    const project = Project.create({ projectId: "project-empty-scene", projectName: "Empty Scene" });
    project.addScene(
      Scene.create({
        sceneId: "scene-empty",
        sceneName: "Empty",
        duration: 3,
      }),
    );

    const dto = projectSnapshotToProjectDto(project.toSnapshot());

    expect(dto.scenes[0]?.characterIds).toEqual([]);
    expect(() => new ProjectJsonSerializer().serialize(dto)).not.toThrow();
  });
});
