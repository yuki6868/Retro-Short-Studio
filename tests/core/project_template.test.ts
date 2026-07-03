import { describe, expect, it } from "vitest";

import { Action, Asset, CharacterInstance, CharacterModel, DeterministicIdGenerator, ProjectTemplate, Scene } from "../../core/src";

function createTemplate(): ProjectTemplate {
  return ProjectTemplate.create({
    templateId: "project-template-1",
    templateName: "Explainer Base",
    description: "Reusable project shape",
    kind: "explainer_short",
    settings: { width: 1080, height: 1920, fps: 30 },
    initialTracks: [
      { trackId: "character:character-instance-template", label: "Character", purpose: "Talk and move actions." },
      { trackId: "effect", label: "Effect", purpose: "Effect actions." },
      { trackId: "camera", label: "Camera", purpose: "Camera actions." },
    ],
    assets: [
      Asset.create({
        assetId: "asset-background-template",
        assetName: "Background",
        assetType: "background",
        assetPath: "assets/backgrounds/template.png",
      }).toSnapshot(),
    ],
    characters: [CharacterModel.create({ characterId: "character-zundamon", characterName: "Zundamon" }).toSnapshot()],
    scenes: [
      Scene.create({
        sceneId: "scene-template-opening",
        sceneName: "Opening",
        duration: 8,
        backgroundAssetId: "asset-background-template",
        characters: [
          CharacterInstance.create({
            instanceId: "character-instance-template",
            characterId: "character-zundamon",
            transform: { x: 10, y: 20, scale: 1, rotation: 0 },
          }).toSnapshot(),
        ],
        actions: [
          Action.create({
            actionId: "action-talk-template",
            actionType: "talk",
            startTime: 0.5,
            endTime: 2,
            targetId: "character-instance-template",
            payload: {
              text: "テンプレートなのだ",
              speakerId: "3",
              speakerCharacterId: "character-instance-template",
              voiceAssetId: null,
              generatedVoicePath: null,
              generatedVoiceDuration: null,
              lipSyncEnabled: true,
            },
          }).toSnapshot(),
        ],
      }).toSnapshot(),
    ],
  });
}

describe("ProjectTemplate", () => {
  it("creates a Project with regenerated project, scene, instance, and action ids", () => {
    const idGenerator = new DeterministicIdGenerator();
    const project = createTemplate().instantiate({
      projectId: idGenerator.generate("project"),
      projectName: "Generated Explainer",
      generateSceneId: () => idGenerator.generate("scene"),
      generateCharacterInstanceId: () => idGenerator.generate("character-instance"),
      generateActionId: () => idGenerator.generate("action"),
    });

    expect(project.toSnapshot()).toMatchObject({
      projectId: "project-1",
      projectName: "Generated Explainer",
      settings: { width: 1080, height: 1920, fps: 30 },
      assets: [{ assetId: "asset-background-template" }],
      characters: [{ characterId: "character-zundamon" }],
      scenes: [
        {
          sceneId: "scene-3",
          backgroundAssetId: "asset-background-template",
          characters: [{ instanceId: "character-instance-2", characterId: "character-zundamon" }],
          actions: [
            {
              actionId: "action-4",
              targetId: "character-instance-2",
              payload: { speakerCharacterId: "character-instance-2" },
            },
          ],
        },
      ],
    });
  });

  it("keeps ProjectTemplate outside the created Project snapshot", () => {
    const project = createTemplate().instantiate({
      projectId: "project-created",
      projectName: "Created Project",
      generateSceneId: () => "scene-created",
      generateCharacterInstanceId: () => "character-instance-created",
      generateActionId: () => "action-created",
    });

    expect(project.toSnapshot().sceneTemplates).toEqual([]);
    expect(project.toSnapshot()).not.toHaveProperty("projectTemplates");
  });
});
