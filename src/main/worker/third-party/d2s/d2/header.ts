import type * as types from 'bridge/third-party/d2s/d2/types.d';
import { te } from '../../../../../shared/i18n';
import { BitReader } from '../binary/bitreader';
import { BitWriter } from '../binary/bitwriter';
import * as header from './versions/default_header';

export async function readHeader(char: types.ID2S, reader: BitReader) {
  try {
    char.header = {} as types.IHeader;
    // 0x0000
    char.header.identifier = reader.ReadUInt32().toString(16).padStart(8, '0');
    if (char.header.identifier != 'aa55aa55') {
      throw te('d2s.parse.header.invalidIdentifier', {
        id: char.header.identifier,
      });
    }
    // 0x0004
    char.header.version = reader.ReadUInt32();
  } catch (error) {
    throw te('d2s.parse.header.readFailed', null, error);
  }
}

export async function readHeaderData(
  char: types.ID2S,
  reader: BitReader,
  constants: types.IConstantData,
) {
  try {
    const v = header;
    if (v == null) {
      throw te('d2s.parse.header.unsupportedVersion.read', {
        version: char.header.version,
        hex: char.header.version.toString(16),
      });
    }
    v.readHeader(char, reader, constants);
  } catch (error) {
    throw te(
      'd2s.parse.header.readDataFailed',
      {
        version: char.header.version,
      },
      error,
    );
  }
}

export async function writeHeader(char: types.ID2S): Promise<Uint8Array> {
  const writer = new BitWriter();
  writer
    .WriteUInt32(parseInt(char.header.identifier, 16))
    .WriteUInt32(char.header.version);

  return writer.ToArray();
}

export async function writeHeaderData(
  char: types.ID2S,
  constants: types.IConstantData,
): Promise<Uint8Array> {
  try {
    const writer = new BitWriter();
    const v = header;
    if (v == null) {
      throw te('d2s.parse.header.unsupportedVersion.write', {
        version: char.header.version,
        hex: char.header.version.toString(16),
      });
    }
    v.writeHeader(char, writer, constants);

    return writer.ToArray();
  } catch (error) {
    throw te(
      'd2s.parse.header.writeDataFailed',
      {
        version: char.header.version,
      },
      error,
    );
  }
}

export async function fixHeader(writer: BitWriter) {
  let checksum = 0;
  const eof = writer.length / 8;
  writer.SeekByte(0x0008).WriteUInt32(eof);
  writer.SeekByte(0x000c).WriteUInt32(0);
  for (let i = 0; i < eof; i++) {
    let byte = writer.SeekByte(i).PeekBytes(1)[0];
    if (checksum & 0x80000000) {
      byte += 1;
    }
    checksum = byte + checksum * 2;
    // hack make it a uint32
    checksum >>>= 0;
  }
  // checksum pos
  writer.SeekByte(0x000c).WriteUInt32(checksum);
}
