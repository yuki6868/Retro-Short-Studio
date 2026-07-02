import { describe, expect, it } from "vitest";

import {
  BROWSER_ACTIVE_PROJECT_STORAGE_KEY,
  BROWSER_PROJECT_INDEX_STORAGE_KEY,
  BROWSER_PROJECT_STORAGE_KEY,
  findBrowserProjectByName,
  getActiveBrowserProjectId,
  listBrowserProjects,
  loadBrowserProject,
  loadBrowserProjectSnapshot,
  loadBrowserProjectSnapshotById,
  hasSavedBrowserProject,
  saveBrowserProject,
  saveBrowserProjectAsNew,
  setActiveBrowserProjectId,
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
    expect(hasSavedBrowserProject(storage)).toBe(true);
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


  it("saves multiple named projects and reloads the selected active project", () => {
    const storage = new MemoryStorage();
    const firstProject = Project.create({ projectId: "project-first", projectName: "First Draft" });
    const secondProject = Project.create({ projectId: "project-second", projectName: "Second Draft" });

    saveBrowserProject(firstProject, "Accounting Short", storage);
    saveBrowserProject(secondProject, "Tax Short", storage);
    setActiveBrowserProjectId("project-first", storage);

    expect(storage.getItem(BROWSER_PROJECT_INDEX_STORAGE_KEY)).not.toBeNull();
    expect(storage.getItem(BROWSER_ACTIVE_PROJECT_STORAGE_KEY)).toBe("project-first");
    expect(getActiveBrowserProjectId(storage)).toBe("project-first");
    expect(listBrowserProjects(storage).map((project) => project.projectName)).toEqual(["Tax Short", "Accounting Short"]);
    expect(loadBrowserProjectSnapshotById("project-second", storage)?.projectName).toBe("Tax Short");
    expect(loadBrowserProjectSnapshot(storage)?.projectId).toBe("project-first");
    expect(loadBrowserProject(storage)?.toSnapshot().projectName).toBe("Accounting Short");
  });


  it("saves the current project as a separate named project instead of overwriting the active one", () => {
    const storage = new MemoryStorage();
    const project = Project.create({ projectId: "project-original", projectName: "Original" });

    saveBrowserProject(project, "Original", storage);
    saveBrowserProjectAsNew(project, "Second Cut", storage, "project-second-cut");

    expect(listBrowserProjects(storage).map((savedProject) => savedProject.projectId)).toEqual([
      "project-second-cut",
      "project-original",
    ]);
    expect(loadBrowserProjectSnapshotById("project-original", storage)?.projectName).toBe("Original");
    expect(loadBrowserProjectSnapshotById("project-second-cut", storage)?.projectName).toBe("Second Cut");
    expect(getActiveBrowserProjectId(storage)).toBe("project-second-cut");
    expect(loadBrowserProject(storage)?.toSnapshot().projectId).toBe("project-second-cut");
  });


  it("rejects Save As New when another saved project already uses the same name", () => {
    const storage = new MemoryStorage();
    const project = Project.create({ projectId: "project-original", projectName: "Original" });

    saveBrowserProject(project, "Accounting Short", storage);
    const duplicateSave = saveBrowserProjectAsNew(project, "  accounting short  ", storage, "project-duplicate");

    expect(duplicateSave).toBeNull();
    expect(findBrowserProjectByName("ACCOUNTING SHORT", storage)?.projectId).toBe("project-original");
    expect(listBrowserProjects(storage).map((savedProject) => savedProject.projectId)).toEqual(["project-original"]);
    expect(loadBrowserProjectSnapshotById("project-duplicate", storage)).toBeNull();
    expect(getActiveBrowserProjectId(storage)).toBe("project-original");
  });
  it("ignores broken storage instead of forcing voice regeneration errors", () => {
    const storage = new MemoryStorage();
    storage.setItem(BROWSER_PROJECT_STORAGE_KEY, "not-json");

    expect(loadBrowserProjectSnapshot(storage)).toBeNull();
    expect(hasSavedBrowserProject(storage)).toBe(false);
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
