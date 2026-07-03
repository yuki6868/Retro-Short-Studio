import { describe, expect, it } from "vitest";

import { SceneTemplateUseCase } from "../../app/src";
import { Action, DeterministicIdGenerator, Project, Scene } from "../../core/src";

function createProject(): Project {
  const project = Project.create({ projectId: "project-1", projectName: "Template Short" });
  project.addScene(
    Scene.create({
      sceneId: "scene-source",
      sceneName: "Reusable Scene",
      duration: 8,
      backgroundAssetId: "asset-background-1",
      characters: [
        {
          instanceId: "character-instance-source",
          characterId: "character-zundamon",
          transform: { x: 10, y: 20, scale: 1, rotation: 0 },
          expression: "neutral",
          eye: "open",
          mouth: "closed",
          motion: "idle",
        },
      ],
      actions: [
        Action.create({
          actionId: "action-talk-source",
          actionType: "talk",
          startTime: 1,
          endTime: 4,
          targetId: "character-instance-source",
          payload: {
            text: "再利用するのだ",
            speakerId: "3",
            speakerCharacterId: "character-instance-source",
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

describe("SceneTemplateUseCase", () => {
  it("saves a scene as a reusable template state", () => {
    const project = createProject();
    const useCase = new SceneTemplateUseCase({ project, idGenerator: new DeterministicIdGenerator() });

    const state = useCase.saveSceneAsTemplate({ sceneId: "scene-source", templateName: "Talk Base" });

    expect(state).toEqual({
      selectedTemplateId: "scene-template-1",
      templates: [
        {
          templateId: "scene-template-1",
          templateName: "Talk Base",
          sourceSceneId: "scene-source",
          duration: 8,
          backgroundAssetId: "asset-background-1",
          characterCount: 1,
          actionCount: 1,
        },
      ],
    });
    expect(project.toSnapshot().sceneTemplates?.[0]?.scene.characters[0]?.instanceId).toBe("character-instance-source");
  });

  it("creates a scene from a template with regenerated ids and remapped TalkAction target", () => {
    const project = createProject();
    const useCase = new SceneTemplateUseCase({ project, idGenerator: new DeterministicIdGenerator() });

    useCase.saveSceneAsTemplate({ sceneId: "scene-source", templateName: "Talk Base" });
    const result = useCase.createSceneFromTemplate({ templateId: "scene-template-1", sceneName: "Talk Base Copy" });

    const createdScene = project.toSnapshot().scenes.find((scene) => scene.sceneId === result.sceneId);
    expect(result.sceneId).toBe("scene-2");
    expect(createdScene).toMatchObject({
      sceneId: "scene-2",
      sceneName: "Talk Base Copy",
      backgroundAssetId: "asset-background-1",
      characters: [{ instanceId: "character-instance-3", characterId: "character-zundamon" }],
      actions: [
        {
          actionId: "action-4",
          targetId: "character-instance-3",
          payload: { speakerCharacterId: "character-instance-3" },
        },
      ],
    });
  });

  it("rejects missing scenes and templates before mutating the project", () => {
    const project = createProject();
    const useCase = new SceneTemplateUseCase({ project, idGenerator: new DeterministicIdGenerator() });

    expect(() => useCase.saveSceneAsTemplate({ sceneId: "missing", templateName: "Missing" })).toThrow(
      "Scene does not exist: missing.",
    );
    expect(() => useCase.createSceneFromTemplate({ templateId: "missing" })).toThrow(
      "SceneTemplate does not exist: missing.",
    );
    expect(project.toSnapshot().sceneTemplates).toEqual([]);
  });
});
