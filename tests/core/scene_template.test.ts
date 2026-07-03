import { describe, expect, it } from "vitest";

import { SceneTemplate, Scene } from "../../core/src";

function createSourceScene() {
  return Scene.create({
    sceneId: "scene-source",
    sceneName: "Opening",
    duration: 6,
    backgroundAssetId: "asset-background-1",
    characters: [
      {
        instanceId: "character-instance-old",
        characterId: "character-zundamon",
        transform: { x: 12, y: 34, scale: 1.2, rotation: 0 },
        expression: "happy",
        eye: "open",
        mouth: "closed",
        motion: "idle",
      },
    ],
    actions: [
      {
        actionId: "action-talk-old",
        actionType: "talk",
        startTime: 1,
        endTime: 3,
        targetId: "character-instance-old",
        payload: {
          text: "テンプレートなのだ",
          speakerId: "3",
          speakerCharacterId: "character-instance-old",
          voiceAssetId: "asset-voice-1",
          generatedVoicePath: "voices/action-talk-old.wav",
          generatedVoiceDuration: 2,
          lipSyncEnabled: true,
          mouthCues: [],
        },
      },
      {
        actionId: "action-camera-old",
        actionType: "camera_zoom",
        startTime: 0,
        endTime: 6,
        targetId: null,
        payload: { fromZoom: 1, toZoom: 1.2, easing: "linear" },
      },
    ],
  });
}

describe("SceneTemplate", () => {
  it("captures scene composition without baking the source scene identity", () => {
    const template = SceneTemplate.create({
      templateId: "template-1",
      templateName: "Opening Template",
      sourceScene: createSourceScene().toSnapshot(),
    });

    expect(template.toSnapshot()).toMatchObject({
      templateId: "template-1",
      templateName: "Opening Template",
      sourceSceneId: "scene-source",
      scene: {
        duration: 6,
        backgroundAssetId: "asset-background-1",
      },
    });
  });

  it("creates a new scene with new scene, character instance, and action ids while preserving asset references", () => {
    const template = SceneTemplate.create({
      templateId: "template-1",
      templateName: "Opening Template",
      sourceScene: createSourceScene().toSnapshot(),
    });
    let characterId = 1;
    let actionId = 1;

    const scene = template.instantiate({
      sceneId: "scene-new",
      sceneName: "Opening Copy",
      generateCharacterInstanceId: () => `character-instance-new-${characterId++}`,
      generateActionId: () => `action-new-${actionId++}`,
    });

    expect(scene.toSnapshot()).toMatchObject({
      sceneId: "scene-new",
      sceneName: "Opening Copy",
      backgroundAssetId: "asset-background-1",
      characters: [
        {
          instanceId: "character-instance-new-1",
          characterId: "character-zundamon",
          transform: { x: 12, y: 34, scale: 1.2, rotation: 0 },
        },
      ],
      actions: [
        {
          actionId: "action-new-1",
          actionType: "talk",
          targetId: "character-instance-new-1",
          payload: {
            speakerCharacterId: "character-instance-new-1",
            voiceAssetId: "asset-voice-1",
          },
        },
        {
          actionId: "action-new-2",
          actionType: "camera_zoom",
          targetId: null,
        },
      ],
    });
  });
});
