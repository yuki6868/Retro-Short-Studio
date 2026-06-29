import { describe, expect, it } from "vitest";

import type { TimelineState } from "../../app/src";
import { Timeline, type TimelineUseCase } from "../../frontend/src";

describe("Timeline", () => {
  it("renders empty timeline tracks before a scene is selected", () => {
    const timeline = new Timeline({ timeline: createTimelineUseCase(emptyState()) });

    const view = timeline.render();

    expect(view.emptyText).toBe("Select a scene to show its actions on the timeline.");
    expect(view.tracks.map((track) => track.label)).toEqual(["Talk", "Character", "Effect", "Camera"]);
    expect(view.tracks.map((track) => track.purpose)).toEqual(["Talk purpose", "Character purpose", "Effect purpose", "Camera purpose"]);
    expect(Object.keys(view)).not.toContain("project");
  });

  it("renders timeline items with position values calculated by the use case", () => {
    const timeline = new Timeline({ timeline: createTimelineUseCase(sceneState()) });

    const view = timeline.render();

    expect(view.sceneName).toBe("Opening");
    expect(view.playheadLeft).toBe(160);
    expect(view.tracks[0]?.items[0]).toMatchObject({
      label: "Talk: Talk 1.0-3.0s",
      summary: "Talk track item for character-1",
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
});

function emptyState(): TimelineState {
  return {
    sceneId: null,
    sceneName: null,
    duration: 0,
    timeScale: 80,
    playhead: 0,
    tracks: [
      { trackId: "talk", label: "Talk", purpose: "Talk purpose", acceptedActionTypes: ["talk"], items: [] },
      { trackId: "character", label: "Character", purpose: "Character purpose", acceptedActionTypes: ["move"], items: [] },
      { trackId: "effect", label: "Effect", purpose: "Effect purpose", acceptedActionTypes: ["fade"], items: [] },
      { trackId: "camera", label: "Camera", purpose: "Camera purpose", acceptedActionTypes: ["camera_zoom"], items: [] },
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
      {
        trackId: "talk",
        label: "Talk",
        purpose: "Talk purpose",
        acceptedActionTypes: ["talk"],
        items: [
          {
            itemId: "timeline-item-action-1",
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
      },
      { trackId: "character", label: "Character", purpose: "Character purpose", acceptedActionTypes: ["move"], items: [] },
      { trackId: "effect", label: "Effect", purpose: "Effect purpose", acceptedActionTypes: ["fade"], items: [] },
      { trackId: "camera", label: "Camera", purpose: "Camera purpose", acceptedActionTypes: ["camera_zoom"], items: [] },
    ],
    ...overrides,
  };
}

function createTimelineUseCase(
  state: TimelineState,
  overrides: Partial<Pick<TimelineUseCase, "showScene" | "setPlayhead" | "setTimeScale">> = {},
): TimelineUseCase {
  return {
    get state() {
      return state;
    },
    showScene: overrides.showScene ?? (() => state),
    setPlayhead: overrides.setPlayhead ?? (() => state),
    setTimeScale: overrides.setTimeScale ?? (() => state),
  };
}
