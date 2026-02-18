import { BitReader } from 'main/worker/third-party/d2s/binary/bitreader';

export function extractRawBytes(
  reader: BitReader,
  startBitOffset: number,
  byteCount: number,
): string {
  try {
    const bytes: number[] = [];
    for (let i = 0; i < byteCount; i++) {
      const bitOffset = startBitOffset + i * 8;
      if (bitOffset + 8 > reader.bits.length) {
        break; // Stop if we've reached the end
      }
      let byte = 0;
      for (let bit = 0; bit < 8; bit++) {
        if (reader.bits[bitOffset + bit]) {
          byte |= 1 << bit;
        }
      }
      bytes.push(byte);
    }

    // Format as hex with 16 bytes per line
    const lines: string[] = [];
    for (let i = 0; i < bytes.length; i += 16) {
      const lineBytes = bytes.slice(i, i + 16);
      const hex = lineBytes
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(' ');
      const offset = Math.floor(startBitOffset / 8) + i;
      lines.push(`  ${offset.toString().padStart(4, '0')}: ${hex}`);
    }
    return '\n' + lines.join('\n');
  } catch (e) {
    return ' (unable to extract bytes)';
  }
}
