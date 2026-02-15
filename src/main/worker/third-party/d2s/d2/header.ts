import type * as types from 'bridge/third-party/d2s/d2/types.d';
import { BitReader } from '../binary/bitreader';
import { BitWriter } from '../binary/bitwriter';
import { wrapParsingError } from './errors';

export async function readHeader(char: types.ID2S, reader: BitReader) {
  try {
    char.header = {} as types.IHeader;
    //0x0000
    char.header.identifier = reader.ReadUInt32().toString(16).padStart(8, '0');
    if (char.header.identifier != 'aa55aa55') {
      throw new Error(
        `Invalid D2S file identifier '0x${char.header.identifier}' (expected 'aa55aa55'). This may not be a valid Diablo II save file.`,
      );
    }
    //0x0004
    char.header.version = reader.ReadUInt32();
  } catch (error) {
    throw wrapParsingError(error, 'Failed to read D2S file header');
  }
}

export async function readHeaderData(
  char: types.ID2S,
  reader: BitReader,
  constants: types.IConstantData,
) {
  try {
    const v = await _versionSpecificHeader(char.header.version);
    if (v == null) {
      throw new Error(
        `Unsupported D2S file version: ${char.header.version} (0x${char.header.version.toString(16)}). This version may not be supported by this parser.`,
      );
    }
    v.readHeader(char, reader, constants);
  } catch (error) {
    throw wrapParsingError(
      error,
      `Failed to read header data for version ${char.header.version}`,
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
    const v = await _versionSpecificHeader(char.header.version);
    if (v == null) {
      throw new Error(
        `Unsupported D2S file version: ${char.header.version} (0x${char.header.version.toString(16)}). This version may not be supported by this writer.`,
      );
    }
    v.writeHeader(char, writer, constants);

    return writer.ToArray();
  } catch (error) {
    throw wrapParsingError(
      error,
      `Failed to write header data for version ${char.header.version}`,
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
    //hack make it a uint32
    checksum >>>= 0;
  }
  //checksum pos
  writer.SeekByte(0x000c).WriteUInt32(checksum);
}

/**
 * Save Version
 * 0x47, 0x0, 0x0, 0x0 = <1.06
 * 0x59, 0x0, 0x0, 0x0 = 1.08 = version
 * 0x5c, 0x0, 0x0, 0x0 = 1.09 = version
 * 0x60, 0x0, 0x0, 0x0 = 1.13c = version
 * 0x62, 0x0, 0x0, 0x0 = 1.2 = version
 * 0x63, 0x0, 0x0, 0x0 = D2R v99 (pre-expansion)
 * 0x69, 0x0, 0x0, 0x0 = D2R v105 (with expansion - new format)
 * */
async function _versionSpecificHeader(version: number) {
  switch (version) {
    case 0x69: { // D2R version 105
      return await import(`./versions/v105_header`);
    }
    case 0x60: {
      return await import(`./versions/default_header`);
    }
    default: {
      return await import(`./versions/default_header`);
    }
  }
}
