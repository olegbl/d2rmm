import type * as types from 'bridge/third-party/d2s/d2/types.d';
import { BitReader } from '../binary/bitreader';
import { BitWriter } from '../binary/bitwriter';
import { getConstantData } from './constants';
import { wrapParsingError } from './errors';
import * as items from './items';

const defaultConfig = {} as types.IConfig;

export async function read(
  buffer: Uint8Array,
  version: number | null,
  realm: number,
  constants?: types.IConstantData,
  _userConfig?: types.IConfig,
): Promise<types.IStash> {
  const stash = {} as types.IStash;
  const reader = new BitReader(buffer);
  const firstHeader = reader.ReadUInt32();
  reader.SeekByte(0);
  if (firstHeader == 0xaa55aa55) {
    // Resurrected
    stash.pages = [];
    let pageCount = 0;
    while (reader.offset < reader.bits.length) {
      pageCount++;
      const { sectionSize, sectionType } = readStashHeader(stash, reader);
      const saveVersion = version || parseInt(stash.version);
      if (!constants) {
        constants = getConstantData(saveVersion);
      }
      if (sectionType === 2) {
        // Advanced tab metadata section (RotW) - store raw bytes for write-back
        const dataBytes = sectionSize - 64; // 64 = header size
        stash.advancedTabData = reader.ReadBytes(dataBytes);
      } else {
        try {
          await readStashPart(
            stash,
            reader,
            saveVersion,
            realm,
            constants,
            sectionType,
          );
        } catch (error) {
          throw wrapParsingError(
            error,
            `Failed to parse stash section ${pageCount}`,
          );
        }
      }
    }
    stash.pageCount = pageCount;
  } else {
    // LoD
    readStashHeader(stash, reader);
    const saveVersion = version || parseInt(stash.version);
    if (!constants) {
      constants = getConstantData(saveVersion);
    }
    await readStashPages(stash, reader, saveVersion, realm, constants);
  }
  return stash;
}

function readStashHeader(
  stash: types.IStash,
  reader: BitReader,
): { sectionSize: number; sectionType: number } {
  const header = reader.ReadUInt32();
  switch (header) {
    // Resurrected
    case 0xaa55aa55: {
      stash.type = 'shared' as types.EStashType;
      stash.kind = reader.ReadUInt32();
      stash.version = reader.ReadUInt32().toString();
      stash.sharedGold = reader.ReadUInt32();
      const sectionSize = reader.ReadUInt32(); // total section size in bytes
      const sectionType = reader.ReadUInt8(8); // 0=normal, 1=advanced stash items, 2=advanced tab metadata
      reader.SkipBytes(43); // remaining padding
      return { sectionSize, sectionType };
    }
    // LoD
    case 0x535353: // SSS
    case 0x4d545343: // CSTM
      stash.version = reader.ReadString(2);
      if (stash.version !== '01' && stash.version !== '02') {
        throw new Error(
          `unkown stash version ${stash.version} at position ${reader.offset - 2 * 8}`,
        );
      }

      stash.type =
        header === 0x535353
          ? ('shared' as types.EStashType)
          : ('private' as types.EStashType);

      if (
        stash.type === ('shared' as types.EStashType) &&
        stash.version == '02'
      ) {
        stash.sharedGold = reader.ReadUInt32();
      }

      if (stash.type === ('private' as types.EStashType)) {
        reader.ReadUInt32();
        stash.sharedGold = 0;
      }

      stash.pageCount = reader.ReadUInt32();
      return { sectionSize: 0, sectionType: 0 };
    default:
      throw new Error(
        `shared stash header 'SSS' / 0xAA55AA55 / private stash header 'CSTM' not found at position ${reader.offset - 3 * 8}`,
      );
  }
}

async function readStashPages(
  stash: types.IStash,
  reader: BitReader,
  version: number,
  realm: number,
  constants: types.IConstantData,
) {
  stash.pages = [];
  for (let i = 0; i < stash.pageCount; i++) {
    try {
      await readStashPage(stash, reader, version, realm, constants);
    } catch (error) {
      throw wrapParsingError(
        error,
        `Failed to parse stash page ${i + 1} of ${stash.pageCount}`,
      );
    }
  }
}

async function readStashPage(
  stash: types.IStash,
  reader: BitReader,
  version: number,
  realm: number,
  constants: types.IConstantData,
) {
  const page: types.IStashPage = {
    items: [],
    name: '',
    type: 0,
  };
  const header = reader.ReadString(2);
  if (header !== 'ST') {
    throw new Error(
      `can not read stash page header ST at position ${reader.offset - 2 * 8}`,
    );
  }

  page.type = reader.ReadUInt32();

  page.name = reader.ReadNullTerminatedString();
  page.items = await items.readItems(
    reader,
    version,
    realm,
    constants,
    defaultConfig,
  );
  stash.pages.push(page);
}

async function readStashPart(
  stash: types.IStash,
  reader: BitReader,
  version: number,
  realm: number,
  constants: types.IConstantData,
  sectionType: number,
) {
  const page: types.IStashPage = {
    items: [],
    name: '',
    type: 0,
    sectionType,
  };
  page.items = await items.readItems(
    reader,
    version,
    realm,
    constants,
    defaultConfig,
  );
  stash.pages.push(page);
}

export async function write(
  data: types.IStash,
  version: number | null,
  realm: number,
  constants?: types.IConstantData,
  userConfig?: types.IConfig,
): Promise<Uint8Array> {
  const config = Object.assign(defaultConfig, userConfig);
  const writer = new BitWriter();
  version ??= parseInt(data.version, 10);
  if (!constants) {
    constants = getConstantData(version);
  }
  if (version > 0x61) {
    for (const page of data.pages) {
      writer.WriteArray(
        await writeStashSection(data, version, realm, constants, config, page),
      );
    }
    if (data.advancedTabData) {
      writer.WriteArray(
        writeAdvancedTabSection(data, version, data.advancedTabData),
      );
    }
  } else {
    writer.WriteArray(await writeStashHeader(data));
    writer.WriteArray(
      await writeStashPages(data, version, realm, constants, config),
    );
  }
  return writer.ToArray();
}

async function writeStashHeader(data: types.IStash): Promise<Uint8Array> {
  const writer = new BitWriter();
  if (data.type === ('private' as types.EStashType)) {
    writer.WriteString('CSTM', 4);
  } else {
    writer.WriteString('SSS', 4);
  }

  writer.WriteString(data.version, data.version.length);

  if (data.type === ('private' as types.EStashType)) {
    writer.WriteString('', 4);
  } else {
    if (data.version == '02') {
      writer.WriteUInt32(data.sharedGold);
    }
  }
  writer.WriteUInt32(data.pages.length);
  return writer.ToArray();
}

async function writeStashSection(
  data: types.IStash,
  version: number,
  realm: number,
  constants: types.IConstantData,
  userConfig: types.IConfig,
  page: types.IStashPage,
): Promise<Uint8Array> {
  const writer = new BitWriter();
  writer.WriteUInt32(0xaa55aa55);
  writer.WriteUInt32(data.kind);
  writer.WriteUInt32(version);
  writer.WriteUInt32(data.sharedGold);
  writer.WriteUInt32(0); // total section size in bytes, patched after writing items
  const padding = new Uint8Array(44);
  padding[0] = page.sectionType ?? 0;
  writer.WriteBytes(padding);
  writer.WriteArray(
    await items.writeItems(page.items, version, realm, constants, userConfig),
  );
  const size = writer.offset;
  writer.SeekByte(16);
  writer.WriteUInt32(Math.ceil(size / 8));
  return writer.ToArray();
}

function writeAdvancedTabSection(
  data: types.IStash,
  version: number,
  advancedTabData: Uint8Array,
): Uint8Array {
  const writer = new BitWriter();
  writer.WriteUInt32(0xaa55aa55);
  writer.WriteUInt32(data.kind);
  writer.WriteUInt32(version);
  writer.WriteUInt32(data.sharedGold);
  writer.WriteUInt32(0); // total section size in bytes, patched below
  const padding = new Uint8Array(44);
  padding[0] = 2; // advanced tab metadata section marker
  writer.WriteBytes(padding);
  writer.WriteBytes(advancedTabData);
  const size = writer.offset;
  writer.SeekByte(16);
  writer.WriteUInt32(Math.ceil(size / 8));
  return writer.ToArray();
}

async function writeStashPages(
  data: types.IStash,
  version: number,
  realm: number,
  constants: types.IConstantData,
  config: types.IConfig,
): Promise<Uint8Array> {
  const writer = new BitWriter();

  for (let i = 0; i < data.pages.length; i++) {
    writer.WriteArray(
      await writeStashPage(data.pages[i], version, realm, constants, config),
    );
  }

  return writer.ToArray();
}

async function writeStashPage(
  data: types.IStashPage,
  version: number,
  realm: number,
  constants: types.IConstantData,
  config: types.IConfig,
): Promise<Uint8Array> {
  const writer = new BitWriter();

  writer.WriteString('ST', 2);
  writer.WriteUInt32(data.type);

  writer.WriteString(data.name, data.name.length + 1);
  writer.WriteArray(
    await items.writeItems(data.items, version, realm, constants, config),
  );

  return writer.ToArray();
}
