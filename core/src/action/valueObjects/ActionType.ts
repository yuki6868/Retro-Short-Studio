import { assertNonEmptyString } from "../../validation";

const BUILT_IN_ACTION_TYPES = [
  "talk",
  "move",
  "fade",
  "flash",
  "camera_move",
  "camera_zoom",
  "custom",
] as const;

export type BuiltInActionType = (typeof BUILT_IN_ACTION_TYPES)[number];

export class ActionType {
  private constructor(private readonly value: string) {}

  static create(value: string): ActionType {
    const normalizedValue = assertNonEmptyString(value, "ActionType");
    return new ActionType(normalizedValue);
  }

  static talk(): ActionType { return ActionType.create("talk"); }
  static move(): ActionType { return ActionType.create("move"); }
  static fade(): ActionType { return ActionType.create("fade"); }
  static flash(): ActionType { return ActionType.create("flash"); }
  static cameraMove(): ActionType { return ActionType.create("camera_move"); }
  static cameraZoom(): ActionType { return ActionType.create("camera_zoom"); }
  static custom(name = "custom"): ActionType { return ActionType.create(name); }

  isBuiltIn(): boolean {
    return BUILT_IN_ACTION_TYPES.includes(this.value as BuiltInActionType);
  }

  toString(): string {
    return this.value;
  }

  equals(other: ActionType): boolean {
    return this.value === other.value;
  }
}
