import { describe, expect, it } from "vitest";

import { InspectorUseCase, PreviewTimelineSyncUseCase, TimelineUseCase } from "../../app/src";
import { Action, Project, Scene } from "../../core/src";

function createProject(): Project {
  const project = Project.create({ projectId: "project-1", projectName: "Preview Sync" });
  project.addScene(
    Scene.create({
      sceneId: "scene-1",
      sceneName: "Opening",
      duration: 10,
      actions: [
        Action.create({
          actionId: "action-talk-1",
          actionType: "talk",
          startTime: 1,
          endTime: 3,
          targetId: "character-1",
          payload: { text: "Hello" },
        }).toSnapshot(),
        Action.create({
          actionId: "action-move-1",
          actionType: "move",
          startTime: 4,
          endTime: 6,
          targetId: "character-1",
          payload: { x: 120 },
        }).toSnapshot(),
      ],
    }),
  );
  return project;
}

describe("PreviewTimelineSyncUseCase", () => {
  it("reflects Preview currentTime to Timeline playhead and selects the active action", () => {
    const project = createProject();
    const timeline = new TimelineUseCase({ project, initialSceneId: "scene-1" });
    const inspector = new InspectorUseCase({ project });
    const sync = new PreviewTimelineSyncUseCase({ project, timeline, inspector });

    const result = sync.syncPreviewCurrentTime({ sceneId: "scene-1", currentTime: 1.5 });

    expect(result.timelineState.playhead).toBe(1.5);
    expect(result.activeActionId).toBe("action-talk-1");
    expect(result.inspectorState?.panel.type).toBe("action");
    expect(result.inspectorState?.selection).toEqual({ type: "action", sceneId: "scene-1", actionId: "action-talk-1" });
  });

  it("reflects Timeline seek time to Timeline playhead and active Inspector action", () => {
    const project = createProject();
    const timeline = new TimelineUseCase({ project, initialSceneId: "scene-1" });
    const inspector = new InspectorUseCase({ project });
    const sync = new PreviewTimelineSyncUseCase({ project, timeline, inspector });

    const result = sync.seekTimeline({ sceneId: "scene-1", time: 4.25 });

    expect(result.timelineState.playhead).toBe(4.25);
    expect(result.activeActionId).toBe("action-move-1");
    expect(result.inspectorState?.selection).toEqual({ type: "action", sceneId: "scene-1", actionId: "action-move-1" });
  });

  it("does not reselect the same action on every preview frame", () => {
    const project = createProject();
    const timeline = new TimelineUseCase({ project, initialSceneId: "scene-1" });
    const inspector = new InspectorUseCase({ project });
    const sync = new PreviewTimelineSyncUseCase({ project, timeline, inspector });

    const first = sync.syncPreviewCurrentTime({ sceneId: "scene-1", currentTime: 1.1 });
    const second = sync.syncPreviewCurrentTime({ sceneId: "scene-1", currentTime: 1.2 });

    expect(first.inspectorState?.selection).toEqual({ type: "action", sceneId: "scene-1", actionId: "action-talk-1" });
    expect(second.timelineState.playhead).toBe(1.2);
    expect(second.activeActionId).toBe("action-talk-1");
    expect(second.inspectorState).toBeNull();
  });
});
