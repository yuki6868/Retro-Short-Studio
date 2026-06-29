export class PreviewClock {
  private currentTimeValue: number;

  constructor(
    private readonly duration: number,
    initialTime: number = 0,
  ) {
    if (!Number.isFinite(duration)) {
      throw new Error("Preview duration must be a finite number.");
    }

    if (duration < 0) {
      throw new Error("Preview duration must be greater than or equal to 0.");
    }

    this.currentTimeValue = this.normalizeTime(initialTime);
  }

  get currentTime(): number {
    return this.currentTimeValue;
  }

  seek(time: number): number {
    this.currentTimeValue = this.normalizeTime(time);
    return this.currentTimeValue;
  }

  private normalizeTime(time: number): number {
    if (!Number.isFinite(time)) {
      throw new Error("Preview time must be a finite number.");
    }

    if (time < 0) {
      return 0;
    }

    if (time > this.duration) {
      return this.duration;
    }

    return time;
  }
}
