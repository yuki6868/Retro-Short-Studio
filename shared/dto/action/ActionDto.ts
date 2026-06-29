export type ActionTypeDto =
  | "talk"
  | "move"
  | "fade"
  | "flash"
  | "camera_move"
  | "camera_zoom"
  | "custom";

export type ActionDto = {
  actionId: string;
  actionType: ActionTypeDto;
  startTime: number;
  endTime: number;
  targetId: string | null;
  payload: Record<string, unknown>;
};
