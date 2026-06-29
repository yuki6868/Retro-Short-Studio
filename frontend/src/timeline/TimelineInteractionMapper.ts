import type {
  MoveTimelineItemInput,
  ResizeTimelineItemEndInput,
  ResizeTimelineItemStartInput,
  TimelineItem,
} from "../../../app/src";

export type TimelineInteractionMapperConfig = {
  timeScale: number;
  snapInterval?: number;
};

export class TimelineInteractionMapper {
  private readonly timeScale: number;
  private readonly snapInterval: number;

  constructor(config: TimelineInteractionMapperConfig) {
    this.timeScale = normalizeTimeScale(config.timeScale);
    this.snapInterval = normalizeSnapInterval(config.snapInterval ?? 0.1);
  }

  pixelsToSeconds(pixels: number): number {
    if (!Number.isFinite(pixels)) {
      throw new Error("Timeline pixels must be a finite number.");
    }

    return roundTimelineTime(pixels / this.timeScale);
  }

  secondsToPixels(seconds: number): number {
    if (!Number.isFinite(seconds)) {
      throw new Error("Timeline seconds must be a finite number.");
    }

    return roundTimelineTime(seconds * this.timeScale);
  }

  snapTime(time: number): number {
    if (!Number.isFinite(time)) {
      throw new Error("Timeline snap time must be a finite number.");
    }

    return roundTimelineTime(Math.round(time / this.snapInterval) * this.snapInterval);
  }

  createMoveInput(item: TimelineItem, deltaPixels: number): MoveTimelineItemInput {
    return {
      sceneId: item.sceneId,
      actionId: item.actionId,
      nextStartTime: this.snapTime(item.startTime + this.pixelsToSeconds(deltaPixels)),
    };
  }

  createResizeStartInput(item: TimelineItem, deltaPixels: number): ResizeTimelineItemStartInput {
    return {
      sceneId: item.sceneId,
      actionId: item.actionId,
      nextStartTime: this.snapTime(item.startTime + this.pixelsToSeconds(deltaPixels)),
    };
  }

  createResizeEndInput(item: TimelineItem, deltaPixels: number): ResizeTimelineItemEndInput {
    return {
      sceneId: item.sceneId,
      actionId: item.actionId,
      nextEndTime: this.snapTime(item.endTime + this.pixelsToSeconds(deltaPixels)),
    };
  }
}

function normalizeTimeScale(timeScale: number): number {
  if (!Number.isFinite(timeScale) || timeScale <= 0) {
    throw new Error("Timeline timeScale must be a positive number.");
  }

  return timeScale;
}

function normalizeSnapInterval(snapInterval: number): number {
  if (!Number.isFinite(snapInterval) || snapInterval <= 0) {
    throw new Error("Timeline snapInterval must be a positive number.");
  }

  return snapInterval;
}

function roundTimelineTime(value: number): number {
  return Number(value.toFixed(6));
}
