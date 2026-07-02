import type { PreviewState } from "../../../app/src";

export type PreviewPlaybackLoopScheduler = {
  request(callback: () => void): number;
  cancel(handle: number): void;
};

export type PreviewPlaybackLoopClock = {
  now(): number;
};

export type PreviewPlaybackLoopConfig = {
  getState(): PreviewState;
  getDuration(): number;
  advance(deltaSeconds: number): Promise<PreviewState> | PreviewState;
  scheduler?: PreviewPlaybackLoopScheduler;
  clock?: PreviewPlaybackLoopClock;
};

export class PreviewPlaybackLoop {
  private readonly scheduler: PreviewPlaybackLoopScheduler;
  private readonly clock: PreviewPlaybackLoopClock;
  private frameHandle: number | null = null;
  private lastTickMs: number | null = null;
  private activeTickGeneration: number | null = null;
  private generation = 0;

  constructor(private readonly config: PreviewPlaybackLoopConfig) {
    this.scheduler = config.scheduler ?? createAnimationFrameScheduler();
    this.clock = config.clock ?? { now: () => performance.now() };
  }

  get isRunning(): boolean {
    return this.frameHandle !== null || this.activeTickGeneration !== null;
  }

  start(): void {
    if (this.isRunning) {
      return;
    }

    if (this.config.getState().playbackStatus !== "playing") {
      return;
    }

    this.generation += 1;
    this.lastTickMs = this.clock.now();
    this.scheduleNextFrame(this.generation);
  }

  pause(): void {
    this.generation += 1;
    this.cancelScheduledFrame();
    this.lastTickMs = null;
  }

  seek(): void {
    this.generation += 1;
    this.cancelScheduledFrame();
    this.lastTickMs = this.clock.now();

    if (this.config.getState().playbackStatus === "playing") {
      this.scheduleNextFrame(this.generation);
    }
  }

  stop(): void {
    this.pause();
  }

  private scheduleNextFrame(generation: number): void {
    this.frameHandle = this.scheduler.request(() => {
      void this.tick(generation);
    });
  }

  private async tick(generation: number): Promise<void> {
    if (generation !== this.generation) {
      return;
    }

    this.frameHandle = null;

    const stateBeforeTick = this.config.getState();
    const duration = this.config.getDuration();

    if (stateBeforeTick.playbackStatus !== "playing" || duration <= 0) {
      this.pause();
      return;
    }

    const now = this.clock.now();
    const previous = this.lastTickMs ?? now;
    this.lastTickMs = now;
    this.activeTickGeneration = generation;

    try {
      const deltaSeconds = Math.max(0, (now - previous) / 1000);
      const nextState = await this.config.advance(deltaSeconds);

      if (generation !== this.generation) {
        return;
      }

      if (nextState.playbackStatus !== "playing" || nextState.currentTime >= duration) {
        this.stop();
        return;
      }
    } finally {
      if (this.activeTickGeneration === generation) {
        this.activeTickGeneration = null;
      }
    }

    if (generation === this.generation && this.config.getState().playbackStatus === "playing") {
      this.scheduleNextFrame(generation);
    }
  }

  private cancelScheduledFrame(): void {
    if (this.frameHandle === null) {
      return;
    }

    this.scheduler.cancel(this.frameHandle);
    this.frameHandle = null;
  }
}

function createAnimationFrameScheduler(): PreviewPlaybackLoopScheduler {
  return {
    request(callback: () => void): number {
      return window.requestAnimationFrame(callback);
    },
    cancel(handle: number): void {
      window.cancelAnimationFrame(handle);
    },
  };
}
