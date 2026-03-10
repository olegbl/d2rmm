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
        // the demon section seems to always be 928 bits
        // and ends with a 0x1FF followed by 3 0 bits
        char.demon = reader.ReadBitArray(928); // 0x0004
      }
    } else {
      throw te('d2s.parse.demon.demonHeaderNotFound', {
        found: header,
        offset: Math.floor((reader.offset - 2 * 8) / 8),
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
  writer.WriteUInt16(char.has_demon);
  if (char.has_demon) {
    writer.WriteBits(char.demon, char.demon.length);
  }
  return writer.ToArray();
}
