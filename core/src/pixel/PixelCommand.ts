import type { PixelDocumentSnapshot } from "./PixelDocument";

export type PixelCommandSnapshot = {
  commandId: string;
  label: string;
  before: PixelDocumentSnapshot;
  after: PixelDocumentSnapshot;
};

export class PixelCommand {
  private constructor(
    private readonly commandId: string,
    private readonly label: string,
    private readonly before: PixelDocumentSnapshot,
    private readonly after: PixelDocumentSnapshot,
  ) {}

  static create(params: { commandId?: string; label: string; before: PixelDocumentSnapshot; after: PixelDocumentSnapshot }): PixelCommand {
    return new PixelCommand(params.commandId ?? createPixelCommandId(), params.label, cloneSnapshot(params.before), cloneSnapshot(params.after));
  }

  static restore(snapshot: PixelCommandSnapshot): PixelCommand {
    return new PixelCommand(snapshot.commandId, snapshot.label, cloneSnapshot(snapshot.before), cloneSnapshot(snapshot.after));
  }

  execute(): PixelDocumentSnapshot {
    return cloneSnapshot(this.after);
  }

  undo(): PixelDocumentSnapshot {
    return cloneSnapshot(this.before);
  }

  toSnapshot(): PixelCommandSnapshot {
    return {
      commandId: this.commandId,
      label: this.label,
      before: cloneSnapshot(this.before),
      after: cloneSnapshot(this.after),
    };
  }
}

function createPixelCommandId(): string {
  return `pixel-command-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cloneSnapshot(snapshot: PixelDocumentSnapshot): PixelDocumentSnapshot {
  return {
    ...snapshot,
    pixels: [...snapshot.pixels],
  };
}
