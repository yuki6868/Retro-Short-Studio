import { describe, expect, it } from "vitest";

import { PreviewPlaybackLoop, type PreviewPlaybackLoopScheduler } from "../../frontend/src";
import type { PreviewState } from "../../app/src";

describe("PreviewPlaybackLoop", () => {
  it("advances currentTime from elapsed frame time while preview is playing", async () => {
    let now = 0;
    let state = createPreviewState({ playbackStatus: "playing", currentTime: 0 });
    const scheduler = createManualScheduler();
    const deltas: number[] = [];
    const loop = new PreviewPlaybackLoop({
      getState: () => state,
      getDuration: () => 2,
      clock: { now: () => now },
      scheduler,
      advance: (deltaSeconds) => {
        deltas.push(deltaSeconds);
        state = { ...state, currentTime: state.currentTime + deltaSeconds };
        return state;
      },
    });

    loop.start();
    now = 500;
    await scheduler.flushNext();

    expect(deltas).toEqual([0.5]);
    expect(state.currentTime).toBe(0.5);
    expect(loop.isRunning).toBe(true);
  });

  it("does not advance after pause cancels the scheduled frame", async () => {
    let now = 0;
    const state = createPreviewState({ playbackStatus: "playing" });
    const scheduler = createManualScheduler();
    let advanceCallCount = 0;
    const loop = new PreviewPlaybackLoop({
      getState: () => state,
      getDuration: () => 2,
      clock: { now: () => now },
      scheduler,
      advance: () => {
        advanceCallCount += 1;
        return state;
      },
    });

    loop.start();
    loop.pause();
    now = 500;
    await scheduler.flushNext();

    expect(advanceCallCount).toBe(0);
    expect(loop.isRunning).toBe(false);
  });

  it("resets elapsed time after seek so playback continues from the seek base time", async () => {
    let now = 0;
    let state = createPreviewState({ playbackStatus: "playing", currentTime: 1 });
    const scheduler = createManualScheduler();
    const deltas: number[] = [];
    const loop = new PreviewPlaybackLoop({
      getState: () => state,
      getDuration: () => 5,
      clock: { now: () => now },
      scheduler,
      advance: (deltaSeconds) => {
        deltas.push(deltaSeconds);
        state = { ...state, currentTime: state.currentTime + deltaSeconds };
        return state;
      },
    });

    loop.start();
    now = 400;
    loop.seek();
    now = 650;
    await scheduler.flushNext();

    expect(deltas).toEqual([0.25]);
    expect(state.currentTime).toBe(1.25);
  });

  it("stops at the scene end when the advanced state is no longer playing", async () => {
    let now = 0;
    let state = createPreviewState({ playbackStatus: "playing", currentTime: 0.9 });
    const scheduler = createManualScheduler();
    const loop = new PreviewPlaybackLoop({
      getState: () => state,
      getDuration: () => 1,
      clock: { now: () => now },
      scheduler,
      advance: (deltaSeconds) => {
        state = {
          ...state,
          currentTime: Math.min(1, state.currentTime + deltaSeconds),
          playbackStatus: "paused",
        };
        return state;
      },
    });

    loop.start();
    now = 200;
    await scheduler.flushNext();

    expect(state.currentTime).toBe(1);
    expect(state.playbackStatus).toBe("paused");
    expect(loop.isRunning).toBe(false);
    expect(scheduler.pendingCount).toBe(0);
  });
});

function createPreviewState(overrides: Partial<PreviewState> = {}): PreviewState {
  return {
    currentTime: 0,
    playbackStatus: "paused",
    framePath: null,
    width: 1280,
    height: 720,
    fps: 30,
    error: null,
    ...overrides,
  };
}

function createManualScheduler(): PreviewPlaybackLoopScheduler & { flushNext(): Promise<void>; readonly pendingCount: number } {
  let nextHandle = 1;
  const callbacks = new Map<number, () => void>();

  return {
    request(callback: () => void): number {
      const handle = nextHandle;
      nextHandle += 1;
      callbacks.set(handle, callback);
      return handle;
    },
    cancel(handle: number): void {
      callbacks.delete(handle);
    },
    async flushNext(): Promise<void> {
      const [handle, callback] = callbacks.entries().next().value ?? [];

      if (handle === undefined || callback === undefined) {
        return;
      }

      callbacks.delete(handle);
      callback();
      await Promise.resolve();
      await Promise.resolve();
    },
    get pendingCount(): number {
      return callbacks.size;
    },
  };
}

// Regression: a user seek while a frame is pending must make the old frame generation stale.
describe("PreviewPlaybackLoop seek priority", () => {
  it("cancels the scheduled frame and restarts elapsed time from the seek moment", async () => {
    let now = 0;
    let state = createPreviewState({ playbackStatus: "playing", currentTime: 2 });
    const scheduler = createManualScheduler();
    const deltas: number[] = [];
    const loop = new PreviewPlaybackLoop({
      getState: () => state,
      getDuration: () => 8,
      clock: { now: () => now },
      scheduler,
      advance: (deltaSeconds) => {
        deltas.push(deltaSeconds);
        state = { ...state, currentTime: state.currentTime + deltaSeconds };
        return state;
      },
    });

    loop.start();
    expect(scheduler.pendingCount).toBe(1);

    now = 300;
    loop.seek();
    expect(scheduler.pendingCount).toBe(1);

    now = 550;
    await scheduler.flushNext();

    expect(deltas).toEqual([0.25]);
    expect(state.currentTime).toBe(2.25);
  });

  it("does not schedule another frame when an old tick resolves after seek", async () => {
    let now = 0;
    let state = createPreviewState({ playbackStatus: "playing", currentTime: 0 });
    const scheduler = createManualScheduler();
    let resolveAdvance: ((state: PreviewState) => void) | null = null;
    const loop = new PreviewPlaybackLoop({
      getState: () => state,
      getDuration: () => 8,
      clock: { now: () => now },
      scheduler,
      advance: () =>
        new Promise<PreviewState>((resolve) => {
          resolveAdvance = resolve;
        }),
    });

    loop.start();
    now = 100;
    const pendingTick = scheduler.flushNext();
    await Promise.resolve();

    loop.seek();
    expect(scheduler.pendingCount).toBe(1);

    const resolve = resolveAdvance as ((state: PreviewState) => void) | null;
    expect(resolve).not.toBeNull();
    resolve?.({ ...state, currentTime: 0.1, playbackStatus: "playing" });
    await pendingTick;

    expect(scheduler.pendingCount).toBe(1);
  });
});
