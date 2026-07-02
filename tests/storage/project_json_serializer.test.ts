import { describe, expect, it } from "vitest";

import type { ProjectDto } from "../../shared";
import { ProjectJsonSerializer } from "../../storage/src";

const validProject: ProjectDto = {
  schemaVersion: 1,
  projectId: "p-1",
  projectName: "Sample",
  settings: { width: 1080, height: 1920, fps: 30 },
  assets: [],
  characters: [],
  scenes: [],
};

describe("ProjectJsonSerializer", () => {
  it("serializes pretty JSON with a trailing newline", () => {
    const serialized = new ProjectJsonSerializer().serialize(validProject);

    expect(serialized).toBe(`${JSON.stringify(validProject, null, 2)}\n`);
  });

  it("deserializes serialized ProjectDto", () => {
    const serializer = new ProjectJsonSerializer();

    expect(serializer.deserialize(serializer.serialize(validProject))).toEqual(validProject);
  });


  it("round-trips TalkAction edits and generated voice metadata", () => {
    const project: ProjectDto = {
      ...validProject,
      assets: [
        {
          assetId: "voice-action-talk-1",
          assetName: "Voice action-talk-1",
          assetType: "voice",
          assetPath: "projects/voices/action-talk-1.wav",
        },
      ],
      characters: [
        {
          characterId: "character-zundamon",
          characterName: "Zundamon",
          imageMapId: null,
        },
      ],
      scenes: [
        {
          sceneId: "scene-opening",
          sceneName: "Opening",
          duration: 8,
          backgroundAssetId: null,
          characterIds: ["character-zundamon"],
          actions: [
            {
              actionId: "action-talk-1",
              actionType: "talk",
              startTime: 0.5,
              endTime: 2.5,
              targetId: "character-zundamon",
              payload: {
                text: "保存後も復元するのだ",
                speakerId: "13",
                speakerCharacterId: "character-zundamon",
                voiceAssetId: "voice-action-talk-1",
                generatedVoicePath: "projects/voices/action-talk-1.wav",
                generatedVoiceDuration: 1.75,
                lipSyncEnabled: false,
              },
            },
          ],
        },
      ],
    };

    const serializer = new ProjectJsonSerializer();

    expect(serializer.deserialize(serializer.serialize(project))).toEqual(project);
  });

  it("throws for invalid JSON", () => {
    expect(() => new ProjectJsonSerializer().deserialize("not-json")).toThrow();
  });

  it.each([
    ["missing projectId", { ...validProject, projectId: undefined }],
    ["blank projectName", { ...validProject, projectName: "   " }],
    ["missing settings", { ...validProject, settings: undefined }],
    ["zero width", { ...validProject, settings: { width: 0, height: 1920, fps: 30 } }],
    ["decimal fps", { ...validProject, settings: { width: 1080, height: 1920, fps: 29.97 } }],
    ["assets not array", { ...validProject, assets: {} }],
    ["characters not array", { ...validProject, characters: null }],
    ["scenes not array", { ...validProject, scenes: "bad" }],
    [
      "talk payload missing lipSyncEnabled",
      {
        ...validProject,
        scenes: [
          {
            sceneId: "scene-1",
            sceneName: "Scene",
            duration: 3,
            backgroundAssetId: null,
            characterIds: [],
            actions: [
              {
                actionId: "action-talk-1",
                actionType: "talk",
                startTime: 0,
                endTime: 1,
                targetId: "character-1",
                payload: {
                  text: "hello",
                  speakerId: "3",
                  speakerCharacterId: "character-1",
                  voiceAssetId: null,
                  generatedVoicePath: null,
                  generatedVoiceDuration: null,
                },
              },
            ],
          },
        ],
      },
    ],
  ])("rejects invalid ProjectDto on serialize: %s", (_label, project) => {
    expect(() => new ProjectJsonSerializer().serialize(project as ProjectDto)).toThrow();
  });

  it.each([
    ["array root", []],
    ["missing projectId", { ...validProject, projectId: undefined }],
    ["blank projectName", { ...validProject, projectName: "   " }],
    ["invalid settings", { ...validProject, settings: { width: 1080, height: -1, fps: 30 } }],
    ["assets not array", { ...validProject, assets: "bad" }],
    [
      "generated voice metadata without voice asset",
      {
        ...validProject,
        scenes: [
          {
            sceneId: "scene-1",
            sceneName: "Scene",
            duration: 3,
            backgroundAssetId: null,
            characterIds: [],
            actions: [
              {
                actionId: "action-talk-1",
                actionType: "talk",
                startTime: 0,
                endTime: 1,
                targetId: "character-1",
                payload: {
                  text: "hello",
                  speakerId: "3",
                  speakerCharacterId: "character-1",
                  voiceAssetId: null,
                  generatedVoicePath: "projects/voices/action-talk-1.wav",
                  generatedVoiceDuration: 1.2,
                  lipSyncEnabled: true,
                },
              },
            ],
          },
        ],
      },
    ],
  ])("rejects invalid ProjectDto on deserialize: %s", (_label, project) => {
    expect(() => new ProjectJsonSerializer().deserialize(JSON.stringify(project))).toThrow();
  });
});
