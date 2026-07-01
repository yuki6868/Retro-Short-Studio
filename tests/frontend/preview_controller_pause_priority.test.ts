import { describe, expect, it } from "vitest";

import { Project, Scene } from "../../core/src";
import { PreviewController } from "../../frontend/src/react/PreviewController";
import { TimelineUseCase, type PreviewState, type TimelineState } from "../../app/src";

function createInitialPreviewState(): PreviewState {
  return {
    currentTime: 0,
    playbackStatus: "paused",
    framePath: null,
    width: 320,
    height: 240,
    fps: 30,
    error: null,
    voicePath: null,
    voiceOffset: 0,
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

describe("PreviewController pause priority", () => {
  it("does not let a pending playing frame overwrite pause", async () => {
    const project = createProject();
    let latestPreviewState = createInitialPreviewState();
    const timeline = new TimelineUseCase({ project, initialSceneId: "scene-1" });
    let latestTimelineState = timeline.state;
    let resolvePlayingFrame: ((state: PreviewState) => void) | null = null;

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
      createInitialPreviewState,
      createPreviewSceneUseCase: (config) => ({
        play: () =>
          new Promise<PreviewState>((resolve) => {
            resolvePlayingFrame = resolve;
          }),
        seek: async (time: number) => ({
          ...createInitialPreviewState(),
          currentTime: time,
          playbackStatus: "paused",
          framePath: "frame.png",
          width: config.width,
          height: config.height,
          fps: config.fps,
        }),
      }),
    });

    latestPreviewState = { ...latestPreviewState, playbackStatus: "playing" };
    controller.setLatestState(latestPreviewState);

    const playbackSession = controller.currentPlaybackSession;
    const pendingAdvance = controller.advancePlayingFrame(1, 8, playbackSession);

    const paused = controller.pause();
    expect(paused.playbackStatus).toBe("paused");

    resolvePlayingFrame?.({
      ...createInitialPreviewState(),
      currentTime: 1,
      playbackStatus: "playing",
      framePath: "frame-1.png",
    });

    const result = await pendingAdvance;

    expect(result.playbackStatus).toBe("paused");
    expect(latestPreviewState.playbackStatus).toBe("paused");
    expect(latestPreviewState.currentTime).toBe(0);
  });
});
