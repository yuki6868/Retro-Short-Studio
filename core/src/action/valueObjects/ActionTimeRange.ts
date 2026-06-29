import { assertFiniteNumber } from "../../validation";

export class ActionTimeRange {
  private constructor(
    private readonly startTime: number,
    private readonly endTime: number,
  ) {}

  static create(startTime: number, endTime: number): ActionTimeRange {
    const normalizedStartTime = assertFiniteNumber(startTime, "Action startTime");
    const normalizedEndTime = assertFiniteNumber(endTime, "Action endTime");

    if (normalizedStartTime < 0) {
      throw new Error("Action startTime must be greater than or equal to 0.");
    }

    if (normalizedEndTime <= normalizedStartTime) {
      throw new Error("Action endTime must be greater than startTime.");
    }

    return new ActionTimeRange(normalizedStartTime, normalizedEndTime);
  }

  toValues(): { startTime: number; endTime: number } {
    return {
      startTime: this.startTime,
      endTime: this.endTime,
    };
  }
}
