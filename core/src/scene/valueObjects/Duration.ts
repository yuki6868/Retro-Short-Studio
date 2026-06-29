export class Duration {
  private constructor(private readonly seconds: number) {}

  static create(seconds: number): Duration {
    if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) {
      throw new Error("Duration must be a positive finite number.");
    }

    return new Duration(seconds);
  }

  toNumber(): number {
    return this.seconds;
  }
}
