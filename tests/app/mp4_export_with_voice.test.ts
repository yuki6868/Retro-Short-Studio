import { describe, expect, it } from "vitest";

import { AudioTrackBuilder, FFmpegCommandBuilder, FfmpegExporter, type FfmpegProcessRunner, type VideoExportProgress } from "../../app/src";
import type { AssetDto, SceneDto } from "../../shared";

describe("FfmpegExporter", () => {
  it("exports an H.264/AAC MP4 from frame sequence and aligned talk action voice clips", async () => {
    const runner = new RecordingFfmpegRunner([{ exitCode: 0 }, { exitCode: 0 }]);
    const progress: VideoExportProgress[] = [];
    const exporter = new FfmpegExporter({ commandId: "cmd-mp4", processRunner: runner });

    const result = await exporter.exportVideo(
      {
        projectId: "project-1",
        scene: createScene(),
        assets: createAssets(),
        frameSequence: { outputDirectory: "renders/opening", fps: 30, duration: 5, frameCount: 150 },
        outputPath: "exports/opening.mp4",
        width: 1280,
        height: 720,
      },
      (next) => progress.push(next),
    );

    expect(result.ok).toBe(true);
    expect(result.payload).toMatchObject({
      outputPath: "exports/opening.mp4",
      format: "mp4",
      fps: 30,
      duration: 5,
      frameCount: 150,
    });
    expect(runner.calls[0]).toEqual({ command: "ffmpeg", args: ["-version"] });
    expect(runner.calls[1]?.args).toEqual(result.payload?.command.slice(1));
    expect(result.payload?.command).toEqual([
      "ffmpeg",
      "-y",
      "-framerate",
      "30",
      "-i",
      "renders/opening/frame_%06d.png",
      "-f",
      "lavfi",
      "-t",
      "5",
      "-i",
      "anullsrc=channel_layout=stereo:sample_rate=44100",
      "-i",
      "voices/action-talk-1.wav",
      "-i",
      "voices/action-talk-2.wav",
      "-filter_complex",
      "[1:a]atrim=0:5,asetpts=PTS-STARTPTS[silence];[2:a]atrim=0:1.5,asetpts=PTS-STARTPTS,adelay=500|500[voice0];[3:a]atrim=0:1.2,asetpts=PTS-STARTPTS,adelay=3000|3000[voice1];[silence][voice0][voice1]amix=inputs=3:duration=longest:dropout_transition=0,atrim=0:5,asetpts=PTS-STARTPTS[aout]",
      "-map",
      "0:v:0",
      "-map",
      "[aout]",
      "-t",
      "5",
      "-r",
      "30",
      "-s",
      "1280x720",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-shortest",
      "exports/opening.mp4",
    ]);
    expect(progress.map((item) => item.stage)).toEqual(["checking_ffmpeg", "building_audio", "encoding", "done"]);
  });

  it("returns a clear error when FFmpeg is unavailable", async () => {
    const runner = new RecordingFfmpegRunner([{ exitCode: 127, stderr: "command not found" }]);
    const exporter = new FfmpegExporter({ processRunner: runner });

    const result = await exporter.exportVideo({
      projectId: "project-1",
      scene: createScene(),
      assets: createAssets(),
      frameSequence: { outputDirectory: "renders", fps: 24, duration: 1, frameCount: 24 },
      outputPath: "exports/out.mp4",
      width: 640,
      height: 360,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("FFmpeg is not available");
    expect(result.error).toContain("command not found");
    expect(runner.calls).toHaveLength(1);
  });

  it("rejects unsafe paths before invoking FFmpeg", async () => {
    const runner = new RecordingFfmpegRunner([]);
    const exporter = new FfmpegExporter({ processRunner: runner });

    const result = await exporter.exportVideo({
      projectId: "project-1",
      scene: createScene(),
      frameSequence: { outputDirectory: "../renders", fps: 24, duration: 1, frameCount: 24 },
      outputPath: "exports/out.mp4",
      width: 640,
      height: 360,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("inside the project folder");
    expect(runner.calls).toEqual([]);
  });
});

describe("AudioTrackBuilder", () => {
  it("uses a silent audio bed when the scene has no generated voices", () => {
    const audio = new AudioTrackBuilder().build({ scene: { ...createScene(), actions: [] }, assets: [], duration: 2 });

    expect(audio.inputs).toEqual([]);
    expect(audio.filterComplex).toBe(
      "[1:a]atrim=0:2,asetpts=PTS-STARTPTS[silence];[silence]amix=inputs=1:duration=longest:dropout_transition=0,atrim=0:2,asetpts=PTS-STARTPTS[aout]",
    );
  });
});

describe("FFmpegCommandBuilder", () => {
  it("keeps command construction separate from exporter orchestration", () => {
    const audio = new AudioTrackBuilder().build({ scene: createScene(), assets: createAssets(), duration: 5 });
    const command = new FFmpegCommandBuilder().build({
      ffmpegPath: "ffmpeg",
      frameDirectory: "renders/opening",
      fps: 30,
      duration: 5,
      width: 1280,
      height: 720,
      outputPath: "exports/opening.mp4",
      audio,
    });

    expect(command[0]).toBe("ffmpeg");
    expect(command).toContain("libx264");
    expect(command).toContain("aac");
    expect(command).toContain("exports/opening.mp4");
  });
});

class RecordingFfmpegRunner implements FfmpegProcessRunner {
  readonly calls: Array<{ command: string; args: string[] }> = [];

  constructor(private readonly results: Array<{ exitCode: number; stderr?: string }>) {}

  async run(command: string, args: string[]): Promise<{ exitCode: number; stderr?: string }> {
    this.calls.push({ command, args });
    return this.results.shift() ?? { exitCode: 0 };
  }
}

function createAssets(): AssetDto[] {
  return [
    { assetId: "voice-2", assetName: "Second Voice", assetType: "voice", assetPath: "voices/action-talk-2.wav" },
  ];
}

function createScene(): SceneDto {
  return {
    sceneId: "scene-opening",
    sceneName: "Opening",
    duration: 5,
    backgroundAssetId: null,
    characterIds: [],
    characters: [],
    actions: [
      {
        actionId: "talk-1",
        actionType: "talk",
        startTime: 0.5,
        endTime: 2,
        targetId: "character-1",
        payload: { text: "hello", generatedVoicePath: "voices/action-talk-1.wav" },
      },
      {
        actionId: "talk-2",
        actionType: "talk",
        startTime: 3,
        endTime: 4.2,
        targetId: "character-2",
        payload: { text: "world", voiceAssetId: "voice-2" },
      },
      {
        actionId: "move-1",
        actionType: "move",
        startTime: 1,
        endTime: 2,
        targetId: "character-1",
        payload: { x: 20, y: 0 },
      },
    ],
  };
}
