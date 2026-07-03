import type { MouthCueSnapshot } from "../../../core/src";
import type { LipSyncProvider, LipSyncRequest, LipSyncResult } from "./LipSyncProvider";

export type VolumeLipSyncProviderConfig = {
  readFile: (path: string) => Promise<ArrayBuffer | Uint8Array>;
  frameRate?: number;
  closedThreshold?: number;
  openThreshold?: number;
};

export class VolumeLipSyncProvider implements LipSyncProvider {
  private readonly readFile: (path: string) => Promise<ArrayBuffer | Uint8Array>;
  private readonly frameRate: number;
  private readonly closedThreshold: number;
  private readonly openThreshold: number;

  constructor(config: VolumeLipSyncProviderConfig) {
    this.readFile = config.readFile;
    this.frameRate = validatePositiveNumber(config.frameRate ?? 30, "VolumeLipSyncProvider frameRate");
    this.closedThreshold = validateThreshold(config.closedThreshold ?? 0.03, "VolumeLipSyncProvider closedThreshold");
    this.openThreshold = validateThreshold(config.openThreshold ?? 0.18, "VolumeLipSyncProvider openThreshold");

    if (this.openThreshold <= this.closedThreshold) {
      throw new Error("VolumeLipSyncProvider openThreshold must be greater than closedThreshold.");
    }
  }

  async generate(request: LipSyncRequest): Promise<LipSyncResult> {
    const audioPath = request.audioPath.trim();

    if (audioPath.length === 0) {
      return { mouthCues: [] };
    }

    const wav = parsePcmWav(await this.readFile(audioPath));
    const duration = normalizeDuration(request.duration, wav.durationSeconds);
    const frameSeconds = 1 / this.frameRate;
    const frameCount = Math.max(1, Math.ceil(duration * this.frameRate));
    const cues: MouthCueSnapshot[] = [];

    for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
      const startTime = roundTime(frameIndex * frameSeconds);
      const endTime = roundTime(Math.min(duration, (frameIndex + 1) * frameSeconds));

      if (endTime <= startTime) {
        continue;
      }

      cues.push({
        startTime,
        endTime,
        mouth: this.resolveMouth(wav.rms(startTime, endTime)),
      });
    }

    return { mouthCues: mergeAdjacentCues(cues) };
  }

  private resolveMouth(volume: number): "closed" | "half" | "open" {
    if (volume <= this.closedThreshold) {
      return "closed";
    }

    if (volume >= this.openThreshold) {
      return "open";
    }

    return "half";
  }
}

type ParsedPcmWav = {
  sampleRate: number;
  channelCount: number;
  sampleCount: number;
  durationSeconds: number;
  rms: (startTime: number, endTime: number) => number;
};

function parsePcmWav(input: ArrayBuffer | Uint8Array): ParsedPcmWav {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  assertAscii(bytes, 0, "RIFF", "WAV file must start with RIFF.");
  assertAscii(bytes, 8, "WAVE", "WAV file must be a WAVE file.");

  let offset = 12;
  let audioFormat: number | null = null;
  let channelCount: number | null = null;
  let sampleRate: number | null = null;
  let bitsPerSample: number | null = null;
  let dataOffset: number | null = null;
  let dataSize: number | null = null;

  while (offset + 8 <= bytes.length) {
    const chunkId = ascii(bytes, offset, 4);
    const chunkSize = view.getUint32(offset + 4, true);
    const chunkDataOffset = offset + 8;

    if (chunkDataOffset + chunkSize > bytes.length) {
      throw new Error(`Invalid WAV chunk size for ${chunkId}.`);
    }

    if (chunkId === "fmt ") {
      if (chunkSize < 16) {
        throw new Error("WAV fmt chunk is too short.");
      }

      audioFormat = view.getUint16(chunkDataOffset, true);
      channelCount = view.getUint16(chunkDataOffset + 2, true);
      sampleRate = view.getUint32(chunkDataOffset + 4, true);
      bitsPerSample = view.getUint16(chunkDataOffset + 14, true);
    }

    if (chunkId === "data") {
      dataOffset = chunkDataOffset;
      dataSize = chunkSize;
    }

    offset = chunkDataOffset + chunkSize + (chunkSize % 2);
  }

  if (audioFormat === null || channelCount === null || sampleRate === null || bitsPerSample === null) {
    throw new Error("WAV fmt chunk was not found.");
  }

  if (dataOffset === null || dataSize === null) {
    throw new Error("WAV data chunk was not found.");
  }

  if (audioFormat !== 1) {
    throw new Error("VolumeLipSyncProvider supports PCM WAV only.");
  }

  if (bitsPerSample !== 16) {
    throw new Error("VolumeLipSyncProvider supports 16-bit PCM WAV only.");
  }

  if (channelCount <= 0 || sampleRate <= 0) {
    throw new Error("WAV channel count and sample rate must be positive.");
  }

  const bytesPerSample = bitsPerSample / 8;
  const bytesPerFrame = channelCount * bytesPerSample;
  const sampleCount = Math.floor(dataSize / bytesPerFrame);
  const durationSeconds = sampleCount / sampleRate;

  return {
    sampleRate,
    channelCount,
    sampleCount,
    durationSeconds,
    rms: (startTime, endTime) => calculateRms({ view, dataOffset, sampleRate, channelCount, sampleCount, startTime, endTime }),
  };
}

function calculateRms(input: {
  view: DataView;
  dataOffset: number;
  sampleRate: number;
  channelCount: number;
  sampleCount: number;
  startTime: number;
  endTime: number;
}): number {
  const startSample = Math.max(0, Math.floor(input.startTime * input.sampleRate));
  const endSample = Math.min(input.sampleCount, Math.ceil(input.endTime * input.sampleRate));

  if (endSample <= startSample) {
    return 0;
  }

  let sumSquares = 0;
  let sampleValues = 0;

  for (let sampleIndex = startSample; sampleIndex < endSample; sampleIndex += 1) {
    for (let channelIndex = 0; channelIndex < input.channelCount; channelIndex += 1) {
      const byteOffset = input.dataOffset + (sampleIndex * input.channelCount + channelIndex) * 2;
      const normalized = input.view.getInt16(byteOffset, true) / 32768;
      sumSquares += normalized * normalized;
      sampleValues += 1;
    }
  }

  return Math.sqrt(sumSquares / sampleValues);
}

function mergeAdjacentCues(cues: MouthCueSnapshot[]): MouthCueSnapshot[] {
  return cues.reduce<MouthCueSnapshot[]>((merged, cue) => {
    const previous = merged.at(-1);

    if (previous !== undefined && previous.mouth === cue.mouth && almostEqual(previous.endTime, cue.startTime)) {
      previous.endTime = cue.endTime;
      return merged;
    }

    merged.push({ ...cue });
    return merged;
  }, []);
}

function normalizeDuration(requestDuration: number, wavDuration: number): number {
  if (!Number.isFinite(requestDuration) || requestDuration < 0) {
    throw new Error("VolumeLipSyncProvider request duration must be a non-negative number.");
  }

  if (requestDuration === 0) {
    return wavDuration;
  }

  return Math.min(requestDuration, wavDuration);
}

function validatePositiveNumber(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be greater than 0.`);
  }

  return value;
}

function validateThreshold(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${name} must be between 0 and 1.`);
  }

  return value;
}

function roundTime(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function almostEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.000001;
}

function assertAscii(bytes: Uint8Array, offset: number, expected: string, message: string): void {
  if (ascii(bytes, offset, expected.length) !== expected) {
    throw new Error(message);
  }
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.slice(offset, offset + length));
}
