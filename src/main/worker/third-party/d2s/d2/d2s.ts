import type * as types from 'bridge/third-party/d2s/d2/types.d';
import { BitReader } from '../binary/bitreader';
import { BitWriter } from '../binary/bitwriter';
import { enhanceAttributes, enhanceItems } from './attribute_enhancer';
import { readAttributes, writeAttributes } from './attributes';
import { getConstantData } from './constants';
import { wrapParsingError, formatCharContext } from './errors';
import {
  readHeader,
  readHeaderData,
  writeHeader,
  writeHeaderData,
  fixHeader,
} from './header';
import * as items from './items';
import { readSkills, writeSkills } from './skills';

const defaultConfig = {
  extendedStash: false,
  sortProperties: true,
} as types.IConfig;

function reader(buffer: Uint8Array) {
  return new BitReader(buffer);
}

async function read(
  buffer: Uint8Array,
  constants?: types.IConstantData,
  userConfig?: types.IConfig,
): Promise<types.ID2S> {
  const char = {} as types.ID2S;
  const reader = new BitReader(buffer);
  const config = Object.assign(defaultConfig, userConfig);

  try {
    await readHeader(char, reader);
  } catch (error) {
    throw wrapParsingError(error, 'Failed to parse D2S file header');
  }

  try {
    //could load constants based on version here
    if (!constants) {
      constants = getConstantData(char.header.version);
    }
  } catch (error) {
    throw wrapParsingError(
      error,
      `Failed to load game data constants for version ${char.header.version}`,
    );
  }

  try {
    await readHeaderData(char, reader, constants);
  } catch (error) {
    throw wrapParsingError(error, 'Failed to parse character header data');
  }

  try {
    await readAttributes(char, reader, constants);
  } catch (error) {
    throw wrapParsingError(error, 'Failed to parse character attributes');
  }

  try {
    await readSkills(char, reader, constants);
  } catch (error) {
    throw wrapParsingError(
      error,
      `Failed to parse character skills for ${formatCharContext(char)}`,
    );
  }

  try {
    await items.readCharItems(char, reader, constants, config);
  } catch (error) {
    throw wrapParsingError(
      error,
      `Failed to parse character items for ${formatCharContext(char)}`,
    );
  }

  try {
    await items.readCorpseItems(char, reader, constants, config);
  } catch (error) {
    throw wrapParsingError(
      error,
      `Failed to parse corpse items for ${formatCharContext(char)}`,
    );
  }

  if (char.header.status.expansion) {
    try {
      await items.readMercItems(char, reader, constants, config);
    } catch (error) {
      throw wrapParsingError(
        error,
        `Failed to parse mercenary items for ${formatCharContext(char)}`,
      );
    }

    try {
      await items.readGolemItems(char, reader, constants, config);
    } catch (error) {
      throw wrapParsingError(
        error,
        `Failed to parse golem item for ${formatCharContext(char)}`,
      );
    }
  }

  try {
    await enhanceAttributes(char, constants, config);
  } catch (error) {
    throw wrapParsingError(
      error,
      `Failed to enhance attributes for ${formatCharContext(char)}`,
    );
  }

  return char;
}

async function readItem(
  buffer: Uint8Array,
  version: number,
  constants?: types.IConstantData,
  userConfig?: types.IConfig,
): Promise<types.IItem> {
  try {
    const reader = new BitReader(buffer);
    const config = Object.assign(defaultConfig, userConfig);
    if (!constants) {
      constants = getConstantData(version);
    }
    const item = await items.readItem(reader, version, constants, config);
    await enhanceItems([item], constants);
    return item;
  } catch (error) {
    throw wrapParsingError(
      error,
      `Failed to parse item from buffer (version ${version})`,
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
  if (data.header.status.expansion) {
    writer.WriteArray(await items.writeMercItems(data, constants, config));
    writer.WriteArray(await items.writeGolemItems(data, constants, config));
  }
  await fixHeader(writer);
  return writer.ToArray();
}

async function writeItem(
  item: types.IItem,
  version: number,
  constants?: types.IConstantData,
  userConfig?: types.IConfig,
): Promise<Uint8Array> {
  const config = Object.assign(defaultConfig, userConfig);
  const writer = new BitWriter();
  if (!constants) {
    constants = getConstantData(version);
  }
  writer.WriteArray(await items.writeItem(item, version, constants, config));
  return writer.ToArray();
}

export { reader, writer, read, write, readItem, writeItem };
