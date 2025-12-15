import type * as types from 'bridge/third-party/d2s/d2/types.d';
import { BitReader } from '../binary/bitreader';
import { BitWriter } from '../binary/bitwriter';
import { enhanceAttributes, enhanceItems } from './attribute_enhancer';
import { readAttributes, writeAttributes } from './attributes';
import { getConstantData } from './constants';
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
  await readHeader(char, reader);
  //could load constants based on version here
  if (!constants) {
    constants = getConstantData(char.header.version);
  }
  await readHeaderData(char, reader, constants);
  await readAttributes(char, reader, constants);
  await readSkills(char, reader, constants);
  await items.readCharItems(char, reader, constants, config);
  await items.readCorpseItems(char, reader, constants, config);
  if (char.header.status.expansion) {
    await items.readMercItems(char, reader, constants, config);
    await items.readGolemItems(char, reader, constants, config);
  }
  await enhanceAttributes(char, constants, config);
  return char;
}

async function readItem(
  buffer: Uint8Array,
  version: number,
  constants?: types.IConstantData,
  userConfig?: types.IConfig,
): Promise<types.IItem> {
  const reader = new BitReader(buffer);
  const config = Object.assign(defaultConfig, userConfig);
  if (!constants) {
    constants = getConstantData(version);
  }
  const item = await items.readItem(reader, version, constants, config);
  await enhanceItems([item], constants);
  return item;
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
