import { PixelCommand, type PixelCommandSnapshot } from "./PixelCommand";
import type { PixelDocumentSnapshot } from "./PixelDocument";

export type PixelHistorySnapshot = {
  undoStack: PixelCommandSnapshot[];
  redoStack: PixelCommandSnapshot[];
};

export type PixelHistoryChange = {
  history: PixelHistory;
  document: PixelDocumentSnapshot;
};

export class PixelHistory {
  private constructor(
    private readonly undoStack: PixelCommand[],
    private readonly redoStack: PixelCommand[],
  ) {}

  static empty(): PixelHistory {
    return new PixelHistory([], []);
  }

  static restore(snapshot: PixelHistorySnapshot): PixelHistory {
    return new PixelHistory(snapshot.undoStack.map(PixelCommand.restore), snapshot.redoStack.map(PixelCommand.restore));
  }

  commit(command: PixelCommand): PixelHistory {
    return new PixelHistory([...this.undoStack, command], []);
  }

  undo(): PixelHistoryChange | null {
    const command = this.undoStack.at(-1);

    if (command === undefined) {
      return null;
    }

    return {
      history: new PixelHistory(this.undoStack.slice(0, -1), [command, ...this.redoStack]),
      document: command.undo(),
    };
  }

  redo(): PixelHistoryChange | null {
    const command = this.redoStack[0];

    if (command === undefined) {
      return null;
    }

    return {
      history: new PixelHistory([...this.undoStack, command], this.redoStack.slice(1)),
      document: command.execute(),
    };
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  toSnapshot(): PixelHistorySnapshot {
    return {
      undoStack: this.undoStack.map((command) => command.toSnapshot()),
      redoStack: this.redoStack.map((command) => command.toSnapshot()),
    };
  }
}
