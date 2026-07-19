import type * as types from 'bridge/third-party/d2s/d2/types.d';
import { te } from '../../../../../shared/i18n';
import { BitReader } from '../binary/bitreader';
import { BitWriter } from '../binary/bitwriter';
import { readAttributes, writeAttributes } from './attributes';
import { getConstantData } from './constants';
import { DEBUG_D2S } from './debug';
import { formatCharContext } from './errors';
import {
  readHeader,
  readHeaderData,
  writeHeader,
  writeHeaderData,
  fixHeader,
} from './header';
import * as items from './items';
import { readSkills, writeSkills } from './skills';

const defaultConfig = {} as types.IConfig;

function reader(buffer: Uint8Array) {
  return new BitReader(buffer);
}

async function read(
  buffer: Uint8Array,
  constants?: types.IConstantData,
  userConfig?: types.IConfig,
): Promise<types.ID2S> {
  const char = {} as types.ID2S;
  try {
    const reader = new BitReader(buffer);
    const config = Object.assign(defaultConfig, userConfig);

    try {
      await readHeader(char, reader);
    } catch (error) {
      throw te('d2s.parse.d2s.headerFailed', null, error);
    }

    try {
      //could load constants based on version here
      if (!constants) {
        constants = getConstantData(char.header.version);
      }
    } catch (error) {
      throw te(
        'd2s.parse.d2s.constantsFailed',
        {
          version: char.header.version,
        },
        error,
      );
    }

    try {
      await readHeaderData(char, reader, constants);
    } catch (error) {
      throw te('d2s.parse.d2s.headerDataFailed', null, error);
    }

    try {
      await readAttributes(char, reader, constants);
    } catch (error) {
      throw te('d2s.parse.d2s.attributesFailed', null, error);
    }

    try {
      await readSkills(char, reader, constants);
    } catch (error) {
      throw te(
        'd2s.parse.d2s.skillsFailed',
        {
          char: formatCharContext(char),
        },
        error,
      );
    }

    try {
      await items.readCharItems(char, reader, constants, config);
    } catch (error) {
      throw te(
        'd2s.parse.d2s.charItemsFailed',
        {
          char: formatCharContext(char),
        },
        error,
      );
    }

    try {
      await items.readCorpseItems(char, reader, constants, config);
    } catch (error) {
      throw te(
        'd2s.parse.d2s.corpseItemsFailed',
        {
          char: formatCharContext(char),
        },
        error,
      );
    }

    if (
      // this feels a bit janky...
      char.header.status.expansion ||
      char.header.realm === 2 ||
      char.header.realm === 3
    ) {
      try {
        await items.readMercItems(char, reader, constants, config);
      } catch (error) {
        throw te(
          'd2s.parse.d2s.mercItemsFailed',
          {
            char: formatCharContext(char),
          },
          error,
        );
      }

      try {
        await items.readGolemItems(char, reader, constants, config);
      } catch (error) {
        throw te(
          'd2s.parse.d2s.golemItemFailed',
          {
            char: formatCharContext(char),
          },
          error,
        );
      }

      if (char.header.version === 0x69 && char.header.realm === 3) {
        try {
          await readDemonData(char, reader, constants, config);
        } catch (error) {
          throw te(
            'd2s.parse.d2s.demonDataFailed',
            {
              char: formatCharContext(char),
            },
            error,
          );
        }
      }
    }

    return char;
  } catch (error) {
    if (DEBUG_D2S) {
      console.warn('Character read so far', char);
    }
    throw te(
      'd2s.parse.d2s.readCharFailed',
      {
        char: formatCharContext(char),
      },
      error,
    );
  }
}

async function readItem(
  buffer: Uint8Array,
  version: number,
  realm: number,
  constants?: types.IConstantData,
  userConfig?: types.IConfig,
): Promise<types.IItem> {
  try {
    const reader = new BitReader(buffer);
    const config = Object.assign(defaultConfig, userConfig);
    if (!constants) {
      constants = getConstantData(version);
    }
    const item = await items.readItem(
      reader,
      version,
      realm,
      constants,
      config,
    );
    return item;
  } catch (error) {
    throw te(
      'd2s.parse.d2s.parseItemFailed',
      {
        version,
      },
      error,
    );
  }
}

function writer(_buffer: Uint8Array) {
  return new BitWriter();
}

async function write(
  data: types.ID2S,
  constants?: types.IConstantData,
  userConfig?: types.IConfig,
): Promise<Uint8Array> {
  const config = Object.assign(defaultConfig, userConfig);

  const writer = new BitWriter();
  writer.WriteArray(await writeHeader(data));
  if (!constants) {
    constants = getConstantData(data.header.version);
  }
  writer.WriteArray(await writeHeaderData(data, constants));
  writer.WriteArray(await writeAttributes(data, constants));
  writer.WriteArray(await writeSkills(data, constants));
  writer.WriteArray(await items.writeCharItems(data, constants, config));
  writer.WriteArray(await items.writeCorpseItem(data, constants, config));
  if (
    data.header.status.expansion ||
    data.header.realm === 2 ||
    data.header.realm === 3
  ) {
    writer.WriteArray(await items.writeMercItems(data, constants, config));
    writer.WriteArray(await items.writeGolemItems(data, constants, config));
    if (data.header.version === 0x69 && data.header.realm === 3) {
      writer.WriteArray(await writeDemonData(data, constants, config));
    }
  }
  await fixHeader(writer);
  return writer.ToArray();
}

async function writeItem(
  item: types.IItem,
  version: number,
  realm: number,
  constants?: types.IConstantData,
  userConfig?: types.IConfig,
): Promise<Uint8Array> {
  const config = Object.assign(defaultConfig, userConfig);
  const writer = new BitWriter();
  if (!constants) {
    constants = getConstantData(version);
  }
  writer.WriteArray(
    await items.writeItem(item, version, realm, constants, config),
  );
  return writer.ToArray();
}

export { reader, writer, read, write, readItem, writeItem };

async function readDemonData(
  char: types.ID2S,
  reader: BitReader,
  _constants: types.IConstantData,
  _config: types.IConfig,
) {
  try {
    const header = reader.ReadString(4); // 0x0000 : 0x01 0x00 0x6c 0x66
    if (header === '\x01\x00lf') {
      char.has_demon = reader.ReadUInt16(); // wtf lol, in yr 2000 this would have been 1 bit
      if (char.has_demon) {
        // the demon section is a fixed 928 bits (116 bytes) - decode the
        // known fields and preserve everything else verbatim for round-tripping
        const demon = { _unknown_data: {} } as types.IDemon;
        demon._unknown_data.b0_2 = reader.ReadBytes(3);
        demon.is_super_unique = reader.ReadUInt16();
        demon.index = reader.ReadUInt16();
        demon._unknown_data.b7_12 = reader.ReadBytes(6);
        demon.difficulty = reader.ReadUInt8();
        demon._unknown_data.b14_24 = reader.ReadBytes(11);
        demon.level_id = reader.ReadUInt16();
        demon._unknown_data.b27_28 = reader.ReadBytes(2);
        demon.level = reader.ReadUInt8();
        demon.is_desecrated = reader.ReadUInt8();
        demon._unknown_data.b31_52 = reader.ReadBytes(22);
        demon.difficulty2 = reader.ReadUInt8();
        demon._unknown_data.b54_56 = reader.ReadBytes(3);
        demon.difficulty3 = reader.ReadUInt8();
        demon._unknown_data.b58_80 = reader.ReadBytes(23);
        demon.mods = Array.from(reader.ReadBytes(9));
        // remaining bytes of the fixed section (stat rolls + 0x1FF terminator)
        demon.stats = reader.ReadBytes(26);
        char.demon = demon;
      }
    } else {
      // header is not present in first save after char is created
      if (char?.header.level === 1) {
        return;
      }

      throw te('d2s.parse.demon.demonHeaderNotFound', {
        found: header,
        offset: Math.floor((reader.offset - 4 * 8) / 8),
      });
    }
  } catch (error) {
    throw te(
      'd2s.parse.demon.readDemonFailed',
      {
        char: formatCharContext(char),
      },
      error,
    );
  }
}

async function writeDemonData(
  char: types.ID2S,
  _constants: types.IConstantData,
  _config: types.IConfig,
): Promise<Uint8Array> {
  const writer = new BitWriter();
  writer.WriteString('\x01\x00lf', 4);
  writer.WriteUInt16(char.has_demon ?? 0);
  if (char.has_demon && char.demon) {
    const demon = char.demon;
    writer.WriteBytes(demon._unknown_data.b0_2 ?? new Uint8Array(3));
    writer.WriteUInt16(demon.is_super_unique ?? 0);
    writer.WriteUInt16(demon.index ?? 0);
    writer.WriteBytes(demon._unknown_data.b7_12 ?? new Uint8Array(6));
    writer.WriteUInt8(demon.difficulty ?? 0);
    writer.WriteBytes(demon._unknown_data.b14_24 ?? new Uint8Array(11));
    writer.WriteUInt16(demon.level_id ?? 0);
    writer.WriteBytes(demon._unknown_data.b27_28 ?? new Uint8Array(2));
    writer.WriteUInt8(demon.level ?? 0);
    writer.WriteUInt8(demon.is_desecrated ?? 0);
    writer.WriteBytes(demon._unknown_data.b31_52 ?? new Uint8Array(22));
    writer.WriteUInt8(demon.difficulty2 ?? 0);
    writer.WriteBytes(demon._unknown_data.b54_56 ?? new Uint8Array(3));
    writer.WriteUInt8(demon.difficulty3 ?? 0);
    writer.WriteBytes(demon._unknown_data.b58_80 ?? new Uint8Array(23));
    writer.WriteBytes(
      demon.mods ? Uint8Array.from(demon.mods) : new Uint8Array(9),
    );
    writer.WriteBytes(demon.stats ?? new Uint8Array(26));
  }
  return writer.ToArray();
}
