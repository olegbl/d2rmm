import { deflateSync } from 'zlib';

/**
 * Given a Buffer containing the binary data of a .sprite file,
 * converts it to a Base64 encoded data URI of a PNG image.
 *
 * .sprite file format parsing is loosely based on:
 * - https://github.com/eezstreet/D2RModding-SpriteEdit/
 */
export function parseSprite(data: Buffer): string | null {
  try {
    const spriteDataView = new DataView(data.buffer);
    const version = spriteDataView.getUint16(0x4, true);
    const width = spriteDataView.getInt32(0x8, true);
    const height = spriteDataView.getInt32(0xc, true);

    if (version == 31) {
      // RGBA
      const rgba = data.subarray(0x28);
      return rgbaToPngBase64(width, height, rgba);
    } else if (version == 61) {
      // TODO: DXT5
      return null;
    }
  } catch (e) {
    (e as Error).message =
      `Failed to convert sprite to data URI. Data length = ${data.length}. ${(e as Error).message}`;
    throw e;
  }

  // TODO: question mark, or something
  return null;
}

function rgbaToPngBase64(width: number, height: number, rgba: Buffer) {
  // Build PNG chunks
  const pngSig = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, width);
  dv.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  dv.setUint8(11, 0);
  dv.setUint8(12, 0);

  const raw = new Uint8Array((width * 4 + 1) * height);
  let src = 0,
    dst = 0;
  for (let y = 0; y < height; y++) {
    raw[dst++] = 0;
    for (let x = 0; x < width * 4; x++) {
      raw[dst++] = rgba[src++];
    }
  }

  const compressed = deflateSync(raw);
  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', new Uint8Array());
  const ihdrChunk = makeChunk('IHDR', ihdr);

  const png = new Uint8Array(
    pngSig.length + ihdrChunk.length + idat.length + iend.length,
  );
  let offset = 0;
  png.set(pngSig, offset);
  offset += pngSig.length;
  png.set(ihdrChunk, offset);
  offset += ihdrChunk.length;
  png.set(idat, offset);
  offset += idat.length;
  png.set(iend, offset);

  return 'data:image/png;base64,' + Buffer.from(png).toString('base64');
}

function makeChunk(typeStr: string, data: Uint8Array): Uint8Array {
  const type = new TextEncoder().encode(typeStr);
  const len = data.length;
  const out = new Uint8Array(8 + len + 4);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, len);
  out.set(type, 4);
  out.set(data, 8);
  const crc = crc32(out.subarray(4, 8 + len));
  dv.setUint32(8 + len, crc);
  return out;
}

function crc32(buffer: Uint8Array): number {
  let c = ~0;
  for (let n = 0; n < buffer.length; n++) {
    c ^= buffer[n];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
