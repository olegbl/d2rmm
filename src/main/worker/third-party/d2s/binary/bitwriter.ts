export class BitWriter {
  public littleEndian = true;
  public bits: Uint8Array;
  public offset = 0;
  public length = 0;

  constructor(capacity = 8192) {
    this.bits = new Uint8Array(capacity);
  }

  public WriteBit(value: number): BitWriter {
    if (this.offset >= this.bits.length) {
      const resized = new Uint8Array(this.bits.length + 8192);
      resized.set(this.bits, 0);
      this.bits = resized;
    }
    this.bits[this.offset++] = value;
    if (this.offset > this.length) this.length++;
    return this;
  }

  public WriteBits(bits: Uint8Array, numberOfBits: number): BitWriter {
    for (let i = 0; i < numberOfBits; i++) {
      this.WriteBit(bits[i]);
    }
    return this;
  }

  public WriteBytes(
    bytes: Uint8Array,
    numberOfBits: number = bytes.length * 8,
  ): BitWriter {
    const toWrite = new Uint8Array(numberOfBits);
    bytes.reduce((acc, c) => {
      const b = c
        .toString(2)
        .padStart(8, '0')
        .split('')
        .reverse()
        .map((e) => parseInt(e, 2));
      b.forEach((bit) => (toWrite[acc++] = bit));
      return acc;
    }, 0);
    return this.WriteBits(toWrite, numberOfBits);
  }

  public WriteArray(
    bytes: Uint8Array,
    numberOfBits: number = bytes.length * 8,
  ): BitWriter {
    return this.WriteBytes(bytes, numberOfBits);
  }

  public WriteByte(value: number, numberOfBits = 8): BitWriter {
    const buffer = new Uint8Array(1);
    new DataView(buffer.buffer).setUint8(0, value);
    return this.WriteBytes(buffer, numberOfBits);
  }

  public WriteUInt8(value: number, numberOfBits = 8): BitWriter {
    return this.WriteByte(value, numberOfBits);
  }

  public WriteUInt16(value: number, numberOfBits: number = 8 * 2): BitWriter {
    const buffer = new Uint8Array(2);
    new DataView(buffer.buffer).setUint16(0, value, this.littleEndian);
    return this.WriteBytes(buffer, numberOfBits);
  }

  public WriteUInt32(value: number, numberOfBits: number = 8 * 4): BitWriter {
    const buffer = new Uint8Array(4);
    new DataView(buffer.buffer).setUint32(0, value, this.littleEndian);
    return this.WriteBytes(buffer, numberOfBits);
  }

  public WriteString(value: string, numberOfBytes: number): BitWriter {
    const buffer = new TextEncoder().encode(value);
    return this.WriteBytes(buffer, numberOfBytes * 8);
  }

  public SeekBit(offset: number): BitWriter {
    this.offset = offset;
    if (this.offset > this.length) {
      this.length = this.offset;
    }
    return this;
  }

  public SeekByte(offset: number): BitWriter {
    return this.SeekBit(offset * 8);
  }

  public PeekBytes(count: number): Uint8Array {
    const buffer = new Uint8Array(count);
    let byteIndex = 0;
    let bitIndex = 0;
    for (let i = 0; i < count * 8; ++i) {
      if (this.bits[this.offset + i]) {
        buffer[byteIndex] |= (1 << bitIndex) & 0xff;
      }
      ++bitIndex;
      if (bitIndex >= 8) {
        ++byteIndex;
        bitIndex = 0;
      }
    }
    return buffer;
  }

  public Align(): BitWriter {
    this.offset = (this.offset + 7) & ~7;
    if (this.offset > this.length) {
      this.length = this.offset;
    }
    return this;
  }

  public ToArray(): Uint8Array {
    const buffer = new Uint8Array((this.length - 1) / 8 + 1);
    let byteIndex = 0;
    let bitIndex = 0;
    for (let i = 0; i < this.length; ++i) {
      if (this.bits[i]) {
        buffer[byteIndex] |= (1 << bitIndex) & 0xff;
      }
      ++bitIndex;
      if (bitIndex >= 8) {
        ++byteIndex;
        bitIndex = 0;
      }
    }
    return buffer;
  }
}
