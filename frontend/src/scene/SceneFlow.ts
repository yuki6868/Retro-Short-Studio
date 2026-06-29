import type { AddSceneInput, MoveSceneInput, SceneFlowState } from "../../../app/src";

export type SceneFlowUseCase = {
  readonly state: SceneFlowState;
  addScene(input: AddSceneInput): SceneFlowState;
  deleteScene(sceneId: string): SceneFlowState;
  moveScene(input: MoveSceneInput): SceneFlowState;
  selectScene(sceneId: string): SceneFlowState;
};

export type SceneFlowProps = {
  title?: string;
  scenes: SceneFlowUseCase;
};

export type SceneFlowItemViewState = {
  sceneId: string;
  sceneName: string;
  duration: number;
  selected: boolean;
  orderLabel: string;
};

export type SceneFlowViewState = {
  title: string;
  scenes: SceneFlowItemViewState[];
  selectedSceneId: string | null;
  sceneCount: number;
  emptyText: string;
  addButton: {
    label: string;
    disabled: boolean;
  };
  canReorder: boolean;
};

export class SceneFlow {
  private latestState: SceneFlowState;

  constructor(private readonly props: SceneFlowProps) {
    this.latestState = props.scenes.state;
  }

  render(): SceneFlowViewState {
    return this.createViewState(this.latestState);
  }

  clickAdd(input: AddSceneInput): SceneFlowViewState {
    this.latestState = this.props.scenes.addScene(input);
    return this.render();
  }

  clickSelect(sceneId: string): SceneFlowViewState {
    this.latestState = this.props.scenes.selectScene(sceneId);
    return this.render();
  }

  clickDelete(sceneId: string): SceneFlowViewState {
    this.latestState = this.props.scenes.deleteScene(sceneId);
    return this.render();
  }

  move(sceneId: string, toIndex: number): SceneFlowViewState {
    this.latestState = this.props.scenes.moveScene({ sceneId, toIndex });
    return this.render();
  }

  private createViewState(state: SceneFlowState): SceneFlowViewState {
    return {
      title: this.props.title ?? "Scene Flow",
      scenes: state.scenes.map((scene, index) => ({
        sceneId: scene.sceneId,
        sceneName: scene.sceneName,
        duration: scene.duration,
        selected: scene.sceneId === state.selectedSceneId,
        orderLabel: `${index + 1}`.padStart(2, "0"),
      })),
      selectedSceneId: state.selectedSceneId,
      sceneCount: state.scenes.length,
      emptyText: state.scenes.length === 0 ? "Add scenes to build the short video flow." : "",
      addButton: {
        label: "Add Scene",
        disabled: false,
      },
      canReorder: state.scenes.length > 1,
    };
  }
}
