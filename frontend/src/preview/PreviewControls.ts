export type ButtonState = {
  label: string;
  disabled: boolean;
};

export class PlayButton {
  constructor(private readonly disabled: boolean = false) {}

  get state(): ButtonState {
    return {
      label: "Play",
      disabled: this.disabled,
    };
  }
}

export class PauseButton {
  constructor(private readonly disabled: boolean = false) {}

  get state(): ButtonState {
    return {
      label: "Pause",
      disabled: this.disabled,
    };
  }
}

export type SeekControlState = {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled: boolean;
};

export class SeekControl {
  constructor(
    private readonly currentTime: number,
    private readonly duration: number,
    private readonly disabled: boolean = false,
  ) {
    if (!Number.isFinite(currentTime)) {
      throw new Error("SeekControl currentTime must be a finite number.");
    }

    if (!Number.isFinite(duration) || duration < 0) {
      throw new Error("SeekControl duration must be greater than or equal to 0.");
    }
  }

  get state(): SeekControlState {
    return {
      label: "Seek",
      value: this.currentTime,
      min: 0,
      max: this.duration,
      disabled: this.disabled,
    };
  }
}
