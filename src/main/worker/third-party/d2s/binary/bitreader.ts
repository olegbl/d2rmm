export class BitReader {
  public littleEndian = true;
  public bits: Uint8Array;
  public offset = 0;

  constructor(arrBuffer: ArrayBuffer) {
    const typedArray = new Uint8Array(arrBuffer);
    this.bits = new Uint8Array(typedArray.length * 8);
    typedArray.reduce((acc: number, c: number) => {
      const b = c
        .toString(2)
        .padStart(8, '0')
        .split('')
        .reverse()
        .map((e) => parseInt(e, 2));
      b.forEach((bit) => (this.bits[acc++] = bit));
      return acc;
    }, 0);
  }

  public ReadBit(): number {
    if (this.offset >= this.bits.length) {
      const byteOffset = Math.floor(this.offset / 8);
      throw new Error(
        `Attempted to read beyond end of buffer at byte offset ${byteOffset} (bit offset ${this.offset}). Buffer size: ${this.bits.length / 8} bytes.`,
      );
    }
    return this.bits[this.offset++];
  }

  public ReadBitArray(count: number): Uint8Array {
    if (this.offset + count > this.bits.length) {
      const byteOffset = Math.floor(this.offset / 8);
      const bytesNeeded = Math.ceil(count / 8);
      const bytesAvailable = Math.floor((this.bits.length - this.offset) / 8);
      throw new Error(
        `Attempted to read ${count} bits (${bytesNeeded} bytes) starting at byte offset ${byteOffset}, but only ${bytesAvailable} bytes available.`,
      );
    }
    const bits = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      bits[i] = this.bits[this.offset++];
    }
    return bits;
  }

  public ReadBits(bytes: Uint8Array, count: number): Uint8Array {
    let byteIndex = 0;
    let bitIndex = 0;
    for (let i = 0; i < count; i++) {
      if (this.bits[this.offset + i]) {
        bytes[byteIndex] |= (1 << bitIndex) & 0xff;
      }
      bitIndex++;
      if (bitIndex == 8) {
        byteIndex++;
        bitIndex = 0;
      }
    }
    this.offset += count;
    return bytes;
  }

  public ReadBytes(bytes: number): Uint8Array {
    return this.ReadBits(new Uint8Array(bytes), bytes * 8);
  }

  public ReadArray(bytes: number): Uint8Array {
    return this.ReadBytes(bytes);
  }

  public ReadByte(bits = 8): number {
    const dataview = new DataView(
      this.ReadBits(new Uint8Array(1), bits).buffer,
    );
    return dataview.getUint8(0);
  }

  public ReadUInt8(bits = 8): number {
    return this.ReadByte(bits);
  }

  public ReadUInt16(bits: number = 8 * 2): number {
    const dataview = new DataView(
      this.ReadBits(new Uint8Array(2), bits).buffer,
    );
    return dataview.getUint16(0, this.littleEndian);
  }

  public ReadUInt32(bits: number = 8 * 4): number {
    const dataview = new DataView(
      this.ReadBits(new Uint8Array(4), bits).buffer,
    );
    return dataview.getUint32(0, this.littleEndian);
  }

  public ReadString(bytes: number): string {
    try {
      const buffer = this.ReadBytes(bytes).buffer;
      return new TextDecoder().decode(buffer);
    } catch (error) {
      const byteOffset = Math.floor(this.offset / 8);
      throw new Error(
        `Failed to read ${bytes}-byte string at byte offset ${byteOffset}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  public ReadNullTerminatedString(): string {
    const start = this.offset;
    while (this.ReadByte()) {}
    const end = this.offset - 8;
    const buffer = this.SeekBit(start).ReadBytes((end - start) / 8);
    this.SeekBit(end + 8);
    return new TextDecoder().decode(buffer);
  }

  public SkipBits(number: number): BitReader {
    this.offset += number;
    return this;
  }

  public SkipBytes(number: number): BitReader {
    return this.SkipBits(number * 8);
  }

  public SeekBit(offset: number): BitReader {
    this.offset = offset;
    return this;
  }

  public SeekByte(offset: number): BitReader {
    return this.SeekBit(offset * 8);
  }

  public Align(): BitReader {
    this.offset = (this.offset + 7) & ~7;
    return this;
  }
}
