import { describe, expect, it } from "vitest";

import { TimelineUseCase, type PreviewState, type TimelineState } from "../../app/src";
import { Project, Scene } from "../../core/src";
import { PreviewController } from "../../frontend/src/react/PreviewController";

function createInitialPreviewState(): PreviewState {
  return {
    currentTime: 0,
    playbackStatus: "paused",
    framePath: null,
    width: 320,
    height: 240,
    fps: 30,
    error: null,
  };
}

function createProject(): Project {
  const project = Project.create({
    projectId: "project-1",
    projectName: "Project",
    settings: { width: 320, height: 240, fps: 30 },
  });
  project.addScene(Scene.create({ sceneId: "scene-1", sceneName: "Opening", duration: 8 }));
  return project;
}

describe("PreviewController timeline sync", () => {
  it("uses the PreviewTimelineSync boundary when preview currentTime changes", async () => {
    const project = createProject();
    const timeline = new TimelineUseCase({ project, initialSceneId: "scene-1" });
    let latestPreviewState = createInitialPreviewState();
    let latestTimelineState = timeline.state;
    const syncedTimes: number[] = [];

    const controller = new PreviewController({
      getProject: () => project,
      getSelectedSceneId: () => "scene-1",
      getTimeline: () => timeline,
      applyPreviewState(state: PreviewState): PreviewState {
        latestPreviewState = state;
        controller.setLatestState(state);
        return state;
      },
      setTimelineState(state: TimelineState): void {
        latestTimelineState = state;
      },
      syncPreviewCurrentTime({ currentTime }): TimelineState {
        syncedTimes.push(currentTime);
        return timeline.setPlayhead({ time: currentTime });
      },
      createInitialPreviewState,
      createPreviewSceneUseCase: (config) => ({
        play: async () => ({
          ...createInitialPreviewState(),
          currentTime: config.initialTime ?? 0,
          playbackStatus: "playing",
          framePath: `frame-${config.initialTime ?? 0}.png`,
        }),
        seek: async (time: number) => ({
          ...createInitialPreviewState(),
          currentTime: time,
          playbackStatus: latestPreviewState.playbackStatus,
          framePath: `frame-${time}.png`,
        }),
      }),
    });

    await controller.seek(2.5);

    expect(syncedTimes).toEqual([2.5]);
    expect(latestTimelineState.playhead).toBe(2.5);
    expect(latestPreviewState.currentTime).toBe(2.5);
  });
});
