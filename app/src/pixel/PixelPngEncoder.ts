import type { PixelDocumentSnapshot } from "../../../core/src";

const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function encodePixelDocumentToPng(document: PixelDocumentSnapshot): Uint8Array {
  const rgba = createPngScanlines(document);
  const idat = createZlibStoredStream(rgba);

  return concatBytes([
    PNG_SIGNATURE,
    createPngChunk("IHDR", createIhdrData(document.width, document.height)),
    createPngChunk("IDAT", idat),
    createPngChunk("IEND", new Uint8Array()),
  ]);
}

function createPngScanlines(document: PixelDocumentSnapshot): Uint8Array {
  const bytesPerPixel = 4;
  const stride = 1 + document.width * bytesPerPixel;
  const scanlines = new Uint8Array(stride * document.height);

  for (let y = 0; y < document.height; y += 1) {
    const rowOffset = y * stride;
    scanlines[rowOffset] = 0;

    for (let x = 0; x < document.width; x += 1) {
      const pixel = document.pixels[y * document.width + x] ?? "transparent";
      const rgba = parsePixelColor(pixel);
      const offset = rowOffset + 1 + x * bytesPerPixel;
      scanlines[offset] = rgba.r;
      scanlines[offset + 1] = rgba.g;
      scanlines[offset + 2] = rgba.b;
      scanlines[offset + 3] = rgba.a;
    }
  }

  return scanlines;
}

function parsePixelColor(pixel: string): { r: number; g: number; b: number; a: number } {
  if (pixel === "transparent") {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  if (!/^#[0-9A-F]{6}$/i.test(pixel)) {
    throw new Error(`Unsupported pixel color for PNG export: ${pixel}.`);
  }

  return {
    r: Number.parseInt(pixel.slice(1, 3), 16),
    g: Number.parseInt(pixel.slice(3, 5), 16),
    b: Number.parseInt(pixel.slice(5, 7), 16),
    a: 255,
  };
}

function createIhdrData(width: number, height: number): Uint8Array {
  const data = new Uint8Array(13);
  writeUint32(data, 0, width);
  writeUint32(data, 4, height);
  data[8] = 8;
  data[9] = 6;
  data[10] = 0;
  data[11] = 0;
  data[12] = 0;
  return data;
}

function createZlibStoredStream(data: Uint8Array): Uint8Array {
  const blocks: Uint8Array[] = [new Uint8Array([0x78, 0x01])];
  let offset = 0;

  while (offset < data.length) {
    const length = Math.min(0xffff, data.length - offset);
    const isFinal = offset + length >= data.length;
    const block = new Uint8Array(5 + length);
    block[0] = isFinal ? 0x01 : 0x00;
    block[1] = length & 0xff;
    block[2] = (length >> 8) & 0xff;
    const nlen = (~length) & 0xffff;
    block[3] = nlen & 0xff;
    block[4] = (nlen >> 8) & 0xff;
    block.set(data.subarray(offset, offset + length), 5);
    blocks.push(block);
    offset += length;
  }

  const checksum = new Uint8Array(4);
  writeUint32(checksum, 0, adler32(data));
  blocks.push(checksum);

  return concatBytes(blocks);
}

function createPngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = asciiBytes(type);
  const chunk = new Uint8Array(12 + data.length);
  writeUint32(chunk, 0, data.length);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  writeUint32(chunk, 8 + data.length, crc32(concatBytes([typeBytes, data])));
  return chunk;
}

function writeUint32(target: Uint8Array, offset: number, value: number): void {
  target[offset] = (value >>> 24) & 0xff;
  target[offset + 1] = (value >>> 16) & 0xff;
  target[offset + 2] = (value >>> 8) & 0xff;
  target[offset + 3] = value & 0xff;
}

function asciiBytes(value: string): Uint8Array {
  return Uint8Array.from([...value].map((char) => char.charCodeAt(0)));
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }

  return result;
}

function adler32(data: Uint8Array): number {
  let a = 1;
  let b = 0;

  for (const byte of data) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }

  return ((b << 16) | a) >>> 0;
}

const CRC_TABLE = createCrcTable();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;

  for (const byte of data) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function createCrcTable(): number[] {
  const table: number[] = [];

  for (let n = 0; n < 256; n += 1) {
    let c = n;

    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }

    table[n] = c >>> 0;
  }

  return table;
}
