export type ExportFormat = "mp4" | "gif" | "frame_sequence";

export type ExportRequest = {
  projectId: string;
  renderDirectory: string;
  audioPaths: string[];
  outputPath: string;
  format: ExportFormat;
  fps: number;
};

export type ExportResult = {
  outputPath: string;
  format: ExportFormat;
};
