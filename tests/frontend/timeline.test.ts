import { describe, expect, it } from "vitest";

import type { TimelineState } from "../../app/src";
import { Timeline, TimelineInteractionMapper, type TimelineUseCase } from "../../frontend/src";

describe("Timeline", () => {
  it("renders empty timeline tracks before a scene is selected", () => {
    const timeline = new Timeline({ timeline: createTimelineUseCase(emptyState()) });

    const view = timeline.render();

    expect(view.emptyText).toBe("Select a scene to show its actions on the timeline.");
    expect(view.tracks.map((track) => track.label)).toEqual(["Unassigned Character", "Effect", "Camera"]);
    expect(view.tracks.map((track) => track.purpose)).toEqual(["Unassigned purpose", "Effect purpose", "Camera purpose"]);
    expect(Object.keys(view)).not.toContain("project");
  });

  it("renders timeline items with position values calculated by the use case", () => {
    const timeline = new Timeline({ timeline: createTimelineUseCase(sceneState()) });

    const view = timeline.render();

    expect(view.sceneName).toBe("Opening");
    expect(view.playheadLeft).toBe(160);
    expect(view.tracks[0]?.items[0]).toMatchObject({
      label: "Talk 1.0-3.0s",
      summary: "Zundamon action for character-1",
      left: 80,
      width: 160,
    });
  });

  it("delegates scene display, playhead, and scale changes instead of editing actions in the frontend", () => {
    const calls: string[] = [];
    const timeline = new Timeline({
      timeline: createTimelineUseCase(emptyState(), {
        showScene: (sceneId) => {
          calls.push(`show:${sceneId}`);
          return sceneState({ sceneId: sceneId ?? "scene-1" });
        },
        setPlayhead: (input) => {
          calls.push(`playhead:${input.time}`);
          return sceneState({ playhead: input.time });
        },
        setTimeScale: (input) => {
          calls.push(`scale:${input.timeScale}`);
          return sceneState({ timeScale: input.timeScale });
        },
      }),
    });

    expect(timeline.showScene("scene-2")).toMatchObject({ sceneId: "scene-2" });
    expect(timeline.setPlayhead(4)).toMatchObject({ playhead: 4, playheadLeft: 320 });
    expect(timeline.setTimeScale(120)).toMatchObject({ timeScale: 120 });
    expect(calls).toEqual(["show:scene-2", "playhead:4", "scale:120"]);
  });

  it("delegates drag and resize commands as action update operations", () => {
    const calls: string[] = [];
    const timeline = new Timeline({
      timeline: createTimelineUseCase(sceneState(), {
        moveItem: (input) => {
          calls.push(`move:${input.sceneId}:${input.actionId}:${input.nextStartTime}`);
          return sceneState();
        },
        resizeItemStart: (input) => {
          calls.push(`resize-start:${input.sceneId}:${input.actionId}:${input.nextStartTime}`);
          return sceneState();
        },
        resizeItemEnd: (input) => {
          calls.push(`resize-end:${input.sceneId}:${input.actionId}:${input.nextEndTime}`);
          return sceneState();
        },
      }),
    });

    timeline.moveItem({ sceneId: "scene-1", actionId: "action-1", nextStartTime: 2 });
    timeline.resizeItemStart({ sceneId: "scene-1", actionId: "action-1", nextStartTime: 0.5 });
    timeline.resizeItemEnd({ sceneId: "scene-1", actionId: "action-1", nextEndTime: 4 });

    expect(calls).toEqual([
      "move:scene-1:action-1:2",
      "resize-start:scene-1:action-1:0.5",
      "resize-end:scene-1:action-1:4",
    ]);
  });

  it("keeps pointer coordinate conversion outside of the timeline component", () => {
    const mapper = new TimelineInteractionMapper({ timeScale: 80, snapInterval: 0.25 });
    const item = sceneState().tracks[0]?.items[0];

    expect(item).toBeDefined();
    expect(mapper.pixelsToSeconds(40)).toBe(0.5);
    expect(mapper.secondsToPixels(1.25)).toBe(100);
    expect(mapper.createMoveInput(item!, 70)).toEqual({
      sceneId: "scene-1",
      actionId: "action-1",
      nextStartTime: 2,
    });
    expect(mapper.createResizeStartInput(item!, -40)).toEqual({
      sceneId: "scene-1",
      actionId: "action-1",
      nextStartTime: 0.5,
    });
    expect(mapper.createResizeEndInput(item!, 45)).toEqual({
      sceneId: "scene-1",
      actionId: "action-1",
      nextEndTime: 3.5,
    });
  });
});

function emptyState(): TimelineState {
  return {
    sceneId: null,
    sceneName: null,
    duration: 0,
    timeScale: 80,
    playhead: 0,
    tracks: [
      trackState({ trackId: "character:unassigned", kind: "unassigned-character", label: "Unassigned Character", purpose: "Unassigned purpose", acceptedActionTypes: ["talk"] }),
      trackState({ trackId: "effect", kind: "effect", label: "Effect", purpose: "Effect purpose", acceptedActionTypes: ["fade"] }),
      trackState({ trackId: "camera", kind: "camera", label: "Camera", purpose: "Camera purpose", acceptedActionTypes: ["camera_zoom"] }),
    ],
  };
}

function sceneState(overrides: Partial<TimelineState> = {}): TimelineState {
  return {
    ...emptyState(),
    sceneId: "scene-1",
    sceneName: "Opening",
    duration: 8,
    timeScale: overrides.timeScale ?? 80,
    playhead: overrides.playhead ?? 2,
    tracks: [
      trackState({
        trackId: "character:character-1",
        kind: "character-instance",
        label: "Zundamon",
        purpose: "Zundamon purpose",
        acceptedActionTypes: ["talk"],
        characterInstanceId: "character-1",
        characterId: "character-model-1",
        items: [
          {
            itemId: "timeline-item-action-1",
            sceneId: "scene-1",
            actionId: "action-1",
            actionType: "talk",
            targetId: "character-1",
            startTime: 1,
            endTime: 3,
            duration: 2,
            left: 80,
            width: 160,
            payload: { text: "Hello" },
          },
        ],
      }),
      trackState({ trackId: "effect", kind: "effect", label: "Effect", purpose: "Effect purpose", acceptedActionTypes: ["fade"] }),
      trackState({ trackId: "camera", kind: "camera", label: "Camera", purpose: "Camera purpose", acceptedActionTypes: ["camera_zoom"] }),
    ],
    ...overrides,
  };
}

function trackState(input: {
  trackId: string;
  kind: TimelineState["tracks"][number]["kind"];
  label: string;
  purpose: string;
  acceptedActionTypes: string[];
  characterInstanceId?: string | null;
  characterId?: string | null;
  iconAssetId?: string | null;
  items?: TimelineState["tracks"][number]["items"];
}): TimelineState["tracks"][number] {
  return {
    trackId: input.trackId,
    kind: input.kind,
    label: input.label,
    purpose: input.purpose,
    acceptedActionTypes: input.acceptedActionTypes,
    characterInstanceId: input.characterInstanceId ?? null,
    characterId: input.characterId ?? null,
    iconAssetId: input.iconAssetId ?? null,
    items: input.items ?? [],
  };
}

function createTimelineUseCase(
  state: TimelineState,
  overrides: Partial<Pick<TimelineUseCase, "showScene" | "setPlayhead" | "setTimeScale" | "moveItem" | "resizeItemStart" | "resizeItemEnd">> = {},
): TimelineUseCase {
  return {
    get state() {
      return state;
    },
    showScene: overrides.showScene ?? (() => state),
    setPlayhead: overrides.setPlayhead ?? (() => state),
    setTimeScale: overrides.setTimeScale ?? (() => state),
    moveItem: overrides.moveItem ?? (() => state),
    resizeItemStart: overrides.resizeItemStart ?? (() => state),
    resizeItemEnd: overrides.resizeItemEnd ?? (() => state),
  };
}
