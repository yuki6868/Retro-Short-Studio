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
        play: async () => ({
          ...createInitialPreviewState(),
          currentTime: config.initialTime ?? 0,
          playbackStatus: "playing",
          framePath: "frame.png",
          width: config.width,
          height: config.height,
          fps: config.fps,
        }),
        seek: (time: number) =>
          new Promise<PreviewState>((resolve) => {
            resolvePlayingFrame = (state: PreviewState) =>
              resolve({
                ...state,
                currentTime: time,
                width: config.width,
                height: config.height,
                fps: config.fps,
              });
          }),
      }),
    });

    latestPreviewState = { ...latestPreviewState, playbackStatus: "playing" };
    controller.setLatestState(latestPreviewState);

    const playbackSession = controller.currentPlaybackSession;
    const pendingAdvance = controller.advancePlayingFrame(1, 8, playbackSession);

    const paused = controller.pause();
    expect(paused.playbackStatus).toBe("paused");

    const resolve = resolvePlayingFrame as ((state: PreviewState) => void) | null;
    expect(resolve).not.toBeNull();
    resolve?.({
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

  it("keeps the preview audio controller outside frame render use cases", async () => {
    const project = createProject();
    let latestPreviewState: PreviewState = { ...createInitialPreviewState(), playbackStatus: "playing" };
    const timeline = new TimelineUseCase({ project, initialSceneId: "scene-1" });
    const audioController = {
      play: async () => undefined,
      pause: () => undefined,
      stop: () => undefined,
      seek: () => undefined,
    };
    const receivedAudioControllers: unknown[] = [];

    const controller = new PreviewController({
      getProject: () => project,
      getSelectedSceneId: () => "scene-1",
      getTimeline: () => timeline,
      applyPreviewState(state: PreviewState): PreviewState {
        latestPreviewState = state;
        controller.setLatestState(state);
        return state;
      },
      setTimelineState(): void {},
      createInitialPreviewState,
      audioController,
      createPreviewSceneUseCase: (config) => {
        receivedAudioControllers.push(config.audioController);
        return {
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
        };
      },
    });

    controller.setLatestState(latestPreviewState);
    const session = controller.currentPlaybackSession;
    await controller.advancePlayingFrame(0.5, 8, session);

    expect(receivedAudioControllers).toEqual([undefined]);
    expect(latestPreviewState.currentTime).toBe(0.5);
  });

  it("does not let a pending playing frame overwrite seek", async () => {
    const project = createProject();
    let latestPreviewState: PreviewState = { ...createInitialPreviewState(), playbackStatus: "playing", currentTime: 1 };
    const timeline = new TimelineUseCase({ project, initialSceneId: "scene-1" });
    const pendingFrameResolvers: Array<() => void> = [];

    const controller = new PreviewController({
      getProject: () => project,
      getSelectedSceneId: () => "scene-1",
      getTimeline: () => timeline,
      applyPreviewState(state: PreviewState): PreviewState {
        latestPreviewState = state;
        controller.setLatestState(state);
        return state;
      },
      setTimelineState(): void {},
      createInitialPreviewState,
      createPreviewSceneUseCase: (config) => ({
        play: async () => ({
          ...createInitialPreviewState(),
          currentTime: config.initialTime ?? 0,
          playbackStatus: "playing",
          framePath: `frame-${config.initialTime ?? 0}.png`,
          width: config.width,
          height: config.height,
          fps: config.fps,
        }),
        seek: (time: number) =>
          new Promise<PreviewState>((resolve) => {
            pendingFrameResolvers.push(() =>
              resolve({
                ...createInitialPreviewState(),
                currentTime: time,
                playbackStatus: latestPreviewState.playbackStatus,
                framePath: `frame-${time}.png`,
                width: config.width,
                height: config.height,
                fps: config.fps,
              }),
            );
          }),
      }),
    });

    controller.setLatestState(latestPreviewState);
    const playbackSession = controller.currentPlaybackSession;
    const pendingAdvance = controller.advancePlayingFrame(0.5, 8, playbackSession);

    expect(pendingFrameResolvers).toHaveLength(1);
    const pendingSeek = controller.seek(4);
    expect(pendingFrameResolvers).toHaveLength(2);

    pendingFrameResolvers[1]?.();
    const seeked = await pendingSeek;
    expect(seeked.currentTime).toBe(4);
    expect(latestPreviewState.currentTime).toBe(4);

    pendingFrameResolvers[0]?.();
    const result = await pendingAdvance;

    expect(result.currentTime).toBe(4);
    expect(latestPreviewState.currentTime).toBe(4);
    expect(latestPreviewState.framePath).toBe("frame-4.png");
  });


  it("does not restart the same voice on every playback frame", async () => {
    const project = createProject();
    let latestPreviewState: PreviewState = {
      ...createInitialPreviewState(),
      playbackStatus: "playing",
      currentTime: 1,
      voicePath: "projects/voices/talk.wav",
      voiceOffset: 1,
    };
    const timeline = new TimelineUseCase({ project, initialSceneId: "scene-1" });
    const audioCalls: string[] = [];
    const controller = new PreviewController({
      getProject: () => project,
      getSelectedSceneId: () => "scene-1",
      getTimeline: () => timeline,
      applyPreviewState(state: PreviewState): PreviewState {
        latestPreviewState = state;
        controller.setLatestState(state);
        return state;
      },
      setTimelineState(): void {},
      createInitialPreviewState,
      audioController: {
        play: async (path: string, offset: number) => {
          audioCalls.push(`play:${path}:${offset}`);
        },
        pause: () => audioCalls.push("pause"),
        stop: () => audioCalls.push("stop"),
        seek: (offset: number) => audioCalls.push(`seek:${offset}`),
      },
      createPreviewSceneUseCase: (config) => ({
        play: async () => ({
          ...createInitialPreviewState(),
          currentTime: config.initialTime ?? 0,
          playbackStatus: "playing",
          framePath: "frame.png",
          voicePath: "projects/voices/talk.wav",
          voiceOffset: config.initialTime ?? 0,
        }),
        seek: async () => ({
          ...createInitialPreviewState(),
          currentTime: config.initialTime ?? 0,
          playbackStatus: "playing",
          framePath: "frame.png",
          voicePath: "projects/voices/talk.wav",
          voiceOffset: config.initialTime ?? 0,
        }),
      }),
    });

    controller.setLatestState(latestPreviewState);
    const session = controller.currentPlaybackSession;
    await controller.advancePlayingFrame(0.1, 8, session);

    expect(audioCalls).toEqual([]);
    expect(latestPreviewState.currentTime).toBeCloseTo(1.1);
  });

  it("starts audio when playback advances into a Talk Action voice", async () => {
    const project = createProject();
    let latestPreviewState: PreviewState = { ...createInitialPreviewState(), playbackStatus: "playing", currentTime: 0.9 };
    const timeline = new TimelineUseCase({ project, initialSceneId: "scene-1" });
    const audioCalls: string[] = [];
    const controller = new PreviewController({
      getProject: () => project,
      getSelectedSceneId: () => "scene-1",
      getTimeline: () => timeline,
      applyPreviewState(state: PreviewState): PreviewState {
        latestPreviewState = state;
        controller.setLatestState(state);
        return state;
      },
      setTimelineState(): void {},
      createInitialPreviewState,
      audioController: {
        play: async (path: string, offset: number) => {
          audioCalls.push(`play:${path}:${offset}`);
        },
        pause: () => audioCalls.push("pause"),
        stop: () => audioCalls.push("stop"),
        seek: (offset: number) => audioCalls.push(`seek:${offset}`),
      },
      createPreviewSceneUseCase: (config) => ({
        play: async () => ({ ...createInitialPreviewState(), currentTime: config.initialTime ?? 0, playbackStatus: "playing" }),
        seek: async () => ({
          ...createInitialPreviewState(),
          currentTime: config.initialTime ?? 0,
          playbackStatus: "playing",
          framePath: "frame.png",
          voicePath: "projects/voices/talk.wav",
          voiceOffset: 0.1,
        }),
      }),
    });

    controller.setLatestState(latestPreviewState);
    const session = controller.currentPlaybackSession;
    await controller.advancePlayingFrame(0.2, 8, session);

    expect(audioCalls).toEqual(["play:projects/voices/talk.wav:0.1"]);
  });

  it("stops audio when playback advances out of a Talk Action voice without stopping preview", async () => {
    const project = createProject();
    let latestPreviewState: PreviewState = {
      ...createInitialPreviewState(),
      playbackStatus: "playing",
      currentTime: 2.9,
      voicePath: "projects/voices/talk.wav",
      voiceOffset: 1.9,
    };
    const timeline = new TimelineUseCase({ project, initialSceneId: "scene-1" });
    const audioCalls: string[] = [];
    const controller = new PreviewController({
      getProject: () => project,
      getSelectedSceneId: () => "scene-1",
      getTimeline: () => timeline,
      applyPreviewState(state: PreviewState): PreviewState {
        latestPreviewState = state;
        controller.setLatestState(state);
        return state;
      },
      setTimelineState(): void {},
      createInitialPreviewState,
      audioController: {
        play: async (path: string, offset: number) => {
          audioCalls.push(`play:${path}:${offset}`);
        },
        pause: () => audioCalls.push("pause"),
        stop: () => audioCalls.push("stop"),
        seek: (offset: number) => audioCalls.push(`seek:${offset}`),
      },
      createPreviewSceneUseCase: (config) => ({
        play: async () => ({ ...createInitialPreviewState(), currentTime: config.initialTime ?? 0, playbackStatus: "playing" }),
        seek: async () => ({
          ...createInitialPreviewState(),
          currentTime: config.initialTime ?? 0,
          playbackStatus: "playing",
          framePath: "frame.png",
          voicePath: null,
          voiceOffset: 0,
        }),
      }),
    });

    controller.setLatestState(latestPreviewState);
    const session = controller.currentPlaybackSession;
    const next = await controller.advancePlayingFrame(0.2, 8, session);

    expect(audioCalls).toEqual(["stop"]);
    expect(next.playbackStatus).toBe("playing");
    expect(latestPreviewState.currentTime).toBeCloseTo(3.1);
  });

  it("does not let an audio playback failure stop preview frames", async () => {
    const project = createProject();
    let latestPreviewState: PreviewState = { ...createInitialPreviewState(), playbackStatus: "playing", currentTime: 0.9 };
    const timeline = new TimelineUseCase({ project, initialSceneId: "scene-1" });
    const controller = new PreviewController({
      getProject: () => project,
      getSelectedSceneId: () => "scene-1",
      getTimeline: () => timeline,
      applyPreviewState(state: PreviewState): PreviewState {
        latestPreviewState = state;
        controller.setLatestState(state);
        return state;
      },
      setTimelineState(): void {},
      createInitialPreviewState,
      audioController: {
        play: async () => {
          throw new Error("audio failed");
        },
        pause: () => undefined,
        stop: () => undefined,
        seek: () => undefined,
      },
      createPreviewSceneUseCase: (config) => ({
        play: async () => ({ ...createInitialPreviewState(), currentTime: config.initialTime ?? 0, playbackStatus: "playing" }),
        seek: async () => ({
          ...createInitialPreviewState(),
          currentTime: config.initialTime ?? 0,
          playbackStatus: "playing",
          framePath: "frame.png",
          voicePath: "projects/voices/talk.wav",
          voiceOffset: 0.1,
        }),
      }),
    });

    controller.setLatestState(latestPreviewState);
    const session = controller.currentPlaybackSession;
    const next = await controller.advancePlayingFrame(0.2, 8, session);

    expect(next.playbackStatus).toBe("playing");
    expect(next.error).toBeNull();
    expect(latestPreviewState.currentTime).toBeCloseTo(1.1);
  });


  it("does not wait for audio.play before applying the next preview frame", async () => {
    const project = createProject();
    let latestPreviewState: PreviewState = { ...createInitialPreviewState(), playbackStatus: "playing", currentTime: 0.9 };
    const timeline = new TimelineUseCase({ project, initialSceneId: "scene-1" });
    let resolveAudioPlay: (() => void) | null = null;
    const controller = new PreviewController({
      getProject: () => project,
      getSelectedSceneId: () => "scene-1",
      getTimeline: () => timeline,
      applyPreviewState(state: PreviewState): PreviewState {
        latestPreviewState = state;
        controller.setLatestState(state);
        return state;
      },
      setTimelineState(): void {},
      createInitialPreviewState,
      audioController: {
        play: () =>
          new Promise<void>((resolve) => {
            resolveAudioPlay = resolve;
          }),
        pause: () => undefined,
        stop: () => undefined,
        seek: () => undefined,
      },
      createPreviewSceneUseCase: (config) => ({
        play: async () => ({ ...createInitialPreviewState(), currentTime: config.initialTime ?? 0, playbackStatus: "playing" }),
        seek: async () => ({
          ...createInitialPreviewState(),
          currentTime: config.initialTime ?? 0,
          playbackStatus: "playing",
          framePath: "frame.png",
          voicePath: "projects/voices/talk.wav",
          voiceOffset: 0.1,
        }),
      }),
    });

    controller.setLatestState(latestPreviewState);
    const session = controller.currentPlaybackSession;
    const next = await controller.advancePlayingFrame(0.2, 8, session);

    expect(next.currentTime).toBeCloseTo(1.1);
    expect(latestPreviewState.currentTime).toBeCloseTo(1.1);
    expect(resolveAudioPlay).not.toBeNull();

    resolveAudioPlay?.();
    await Promise.resolve();
  });

});
