import { describe, expect, it } from "vitest";

import {
  BROWSER_PROJECT_STORAGE_KEY,
  loadBrowserProject,
  loadBrowserProjectSnapshot,
  saveBrowserProject,
} from "../../frontend/src";
import { Asset, Project, Scene, Action } from "../../core/src";

describe("BrowserProjectPersistence", () => {
  it("stores generated voice metadata so reload can reuse an existing TalkAction voice", () => {
    const storage = new MemoryStorage();
    const project = Project.create({ projectId: "project-local-preview", projectName: "Local Preview" });
    project.addAsset(
      Asset.create({
        assetId: "voice-action-talk-opening",
        assetName: "Voice action-talk-opening",
        assetType: "voice",
        assetPath: "projects/voices/action-talk-opening.wav",
      }),
    );
    project.addScene(
      Scene.create({
        sceneId: "scene-opening",
        sceneName: "Opening",
        duration: 8,
        actions: [
          Action.create({
            actionId: "action-talk-opening",
            actionType: "talk",
            startTime: 0.5,
            endTime: 2.5,
            targetId: "character-zundamon",
            payload: {
              text: "今日のテーマを説明するのだ。",
              speakerId: "3",
              speakerCharacterId: "character-zundamon",
              voiceAssetId: "voice-action-talk-opening",
              generatedVoicePath: "projects/voices/action-talk-opening.wav",
              generatedVoiceDuration: 2.37,
              lipSyncEnabled: true,
            },
          }).toSnapshot(),
        ],
      }),
    );

    saveBrowserProject(project, storage);

    const storedSnapshot = loadBrowserProjectSnapshot(storage);
    const reloadedProject = loadBrowserProject(storage);
    const reloadedSnapshot = reloadedProject?.toSnapshot();

    expect(storage.getItem(BROWSER_PROJECT_STORAGE_KEY)).not.toBeNull();
    expect(storedSnapshot?.assets[0]).toMatchObject({
      assetId: "voice-action-talk-opening",
      assetType: "voice",
      assetPath: "projects/voices/action-talk-opening.wav",
    });
    expect(reloadedSnapshot?.scenes[0]?.actions[0]?.payload).toMatchObject({
      voiceAssetId: "voice-action-talk-opening",
      generatedVoicePath: "projects/voices/action-talk-opening.wav",
      generatedVoiceDuration: 2.37,
    });
  });

  it("ignores broken storage instead of forcing voice regeneration errors", () => {
    const storage = new MemoryStorage();
    storage.setItem(BROWSER_PROJECT_STORAGE_KEY, "not-json");

    expect(loadBrowserProjectSnapshot(storage)).toBeNull();
    expect(loadBrowserProject(storage)).toBeNull();
  });
});

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}
