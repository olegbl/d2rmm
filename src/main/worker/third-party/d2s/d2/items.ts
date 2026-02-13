import type * as types from 'bridge/third-party/d2s/d2/types.d';
import { BitReader } from '../binary/bitreader';
import { BitWriter } from '../binary/bitwriter';
import { wrapParsingError, formatItemContext, formatCharContext } from './errors';

enum ItemType {
  Armor = 0x01,
  Shield = 0x02, //treated the same as armor... only here to be able to parse nokkas jsons
  Weapon = 0x03,
  Other = 0x04,
}

enum Quality {
  Low = 0x01,
  Normal = 0x02,
  Superior = 0x03,
  Magic = 0x04,
  Set = 0x05,
  Rare = 0x06,
  Unique = 0x07,
  Crafted = 0x08,
}

// prettier-ignore
// huffman tree
const HUFFMAN = [[[[["w","u"],[["8",["y",["5",["j",[]]]]],"h"]],["s",[["2","n"],"x"]]],[[["c",["k","f"]],"b"],[["t","m"],["9","7"]]]],[" ",[[[["e","d"],"p"],["g",[[["z","q"],"3"],["v","6"]]]],[["r","l"],["a",[["1",["4","0"]],["i","o"]]]]]]];
// prettier-ignore
const HUFFMAN_LOOKUP = { "0": { "v": 223, "l": 8 }, "1": { "v": 31, "l": 7 }, "2": { "v": 12, "l": 6 }, "3": { "v": 91, "l": 7 }, "4": { "v": 95, "l": 8 }, "5": { "v": 104, "l": 8 }, "6": { "v": 123, "l": 7 }, "7": { "v": 30, "l": 5 }, "8": { "v": 8, "l": 6 }, "9": { "v": 14, "l": 5 }, " ": { "v": 1, "l": 2 }, "a": { "v": 15, "l": 5 }, "b": { "v": 10, "l": 4 }, "c": { "v": 2, "l": 5 }, "d": { "v": 35, "l": 6 }, "e": { "v": 3, "l": 6 }, "f": { "v": 50, "l": 6 }, "g": { "v": 11, "l": 5 }, "h": { "v": 24, "l": 5 }, "i": { "v": 63, "l": 7 }, "j": { "v": 232, "l": 9 }, "k": { "v": 18, "l": 6 }, "l": { "v": 23, "l": 5 }, "m": { "v": 22, "l": 5 }, "n": { "v": 44, "l": 6 }, "o": { "v": 127, "l": 7 }, "p": { "v": 19, "l": 5 }, "q": { "v": 155, "l": 8 }, "r": { "v": 7, "l": 5 }, "s": { "v": 4, "l": 4 }, "t": { "v": 6, "l": 5 }, "u": { "v": 16, "l": 5 }, "v": { "v": 59, "l": 7 }, "w": { "v": 0, "l": 5 }, "x": { "v": 28, "l": 5 }, "y": { "v": 40, "l": 7 }, "z": { "v": 27, "l": 8 } };

export async function readCharItems(
  char: types.ID2S,
  reader: BitReader,
  constants: types.IConstantData,
  config: types.IConfig,
) {
  char.items = await readItems(
    reader,
    char.header.version,
    constants,
    config,
    char,
  );
}

export async function writeCharItems(
  char: types.ID2S,
  constants: types.IConstantData,
  config: types.IConfig,
): Promise<Uint8Array> {
  const writer = new BitWriter();
  writer.WriteArray(
    await writeItems(char.items, char.header.version, constants, config),
  );
  return writer.ToArray();
}

export async function readMercItems(
  char: types.ID2S,
  reader: BitReader,
  constants: types.IConstantData,
  config: types.IConfig,
) {
  try {
    char.merc_items = [] as types.IItem[];
    const header = reader.ReadString(2); //0x0000 [merc item list header = "jf"]
    if (header !== 'jf') {
      // header is not present in first save after char is created
      if (char?.header.level === 1) {
        return;
      }

      const byteOffset = Math.floor((reader.offset - 2 * 8) / 8);
      throw new Error(
        `Mercenary item list header 'jf' not found (found '${header}' instead) at byte offset ${byteOffset}`,
      );
    }
    if (char.header.merc_id && parseInt(char.header.merc_id, 16) !== 0) {
      char.merc_items = await readItems(
        reader,
        char.header.version,
        constants,
        config,
        char,
      );
    }
  } catch (error) {
    throw wrapParsingError(
      error,
      `Failed to read mercenary items for ${formatCharContext(char)}`,
    );
  }
}

export async function writeMercItems(
  char: types.ID2S,
  constants: types.IConstantData,
  config: types.IConfig,
): Promise<Uint8Array> {
  const writer = new BitWriter();
  writer.WriteString('jf', 2);
  if (char.header.merc_id && parseInt(char.header.merc_id, 16) !== 0) {
    char.merc_items = char.merc_items || [];
    writer.WriteArray(
      await writeItems(char.merc_items, char.header.version, constants, config),
    );
  }
  return writer.ToArray();
}

export async function readGolemItems(
  char: types.ID2S,
  reader: BitReader,
  constants: types.IConstantData,
  config: types.IConfig,
) {
  try {
    const header = reader.ReadString(2); //0x0000 [golem item list header = "kf"]
    if (header !== 'kf') {
      // header is not present in first save after char is created
      if (char?.header.level === 1) {
        return;
      }

      const byteOffset = Math.floor((reader.offset - 2 * 8) / 8);
      throw new Error(
        `Golem item header 'kf' not found (found '${header}' instead) at byte offset ${byteOffset}`,
      );
    }
    const has_golem = reader.ReadUInt8();
    if (has_golem === 1) {
      char.golem_item = await readItem(
        reader,
        char.header.version,
        constants,
        config,
      );
    }
  } catch (error) {
    throw wrapParsingError(
      error,
      `Failed to read golem item for ${formatCharContext(char)}`,
    );
  }
}

export async function writeGolemItems(
  char: types.ID2S,
  constants: types.IConstantData,
  config: types.IConfig,
): Promise<Uint8Array> {
  const writer = new BitWriter();
  writer.WriteString('kf', 2);
  if (char.golem_item) {
    writer.WriteUInt8(1);
    writer.WriteArray(
      await writeItem(char.golem_item, char.header.version, constants, config),
    );
  } else {
    writer.WriteUInt8(0);
  }
  return writer.ToArray();
}

export async function readCorpseItems(
  char: types.ID2S,
  reader: BitReader,
  constants: types.IConstantData,
  config: types.IConfig,
) {
  try {
    char.corpse_items = [] as types.IItem[];
    const header = reader.ReadString(2); //0x0000 [item list header = 0x4a, 0x4d "JM"]
    if (header !== 'JM') {
      // header is not present in first save after char is created
      if (char.header.level === 1) {
        char.is_dead = 0;
        return;
      }

      const byteOffset = Math.floor((reader.offset - 2 * 8) / 8);
      throw new Error(
        `Corpse item list header 'JM' not found (found '${header}' instead) at byte offset ${byteOffset}`,
      );
    }
    char.is_dead = reader.ReadUInt16(); //0x0002 [corpse count]
    for (let i = 0; i < char.is_dead; i++) {
      try {
        reader.SkipBytes(12); //0x0004 [unk4, x_pos, y_pos]
        char.corpse_items = char.corpse_items.concat(
          await readItems(reader, char.header.version, constants, config, char),
        );
      } catch (error) {
        throw wrapParsingError(error, `Failed to read corpse ${i + 1} of ${char.is_dead}`);
      }
    }
  } catch (error) {
    throw wrapParsingError(
      error,
      `Failed to read corpse items for ${formatCharContext(char)}`,
    );
  }
}

export async function writeCorpseItem(
  char: types.ID2S,
  constants: types.IConstantData,
  config: types.IConfig,
): Promise<Uint8Array> {
  const writer = new BitWriter();
  writer.WriteString('JM', 2);
  writer.WriteUInt16(char.is_dead);
  //json struct doesnt support multiple corpses without modifying it
  if (char.is_dead) {
    writer.WriteArray(new Uint8Array(12));
    char.corpse_items = char.corpse_items || [];
    writer.WriteArray(
      await writeItems(
        char.corpse_items,
        char.header.version,
        constants,
        config,
      ),
    );
  }
  return writer.ToArray();
}

export async function readItems(
  reader: BitReader,
  version: number,
  constants: types.IConstantData,
  config: types.IConfig,
  char?: types.ID2S,
) {
  const items = [] as types.IItem[];
  const header = reader.ReadString(2); //0x0000 [item list header = 0x4a, 0x4d "JM"]
  if (header !== 'JM') {
    // header is not present in first save after char is created
    if (char?.header.level === 1) {
      return []; // TODO: return starter items based on class
    }

    const byteOffset = Math.floor((reader.offset - 2 * 8) / 8);
    throw new Error(
      `Item list header 'JM' not found (found '${header}' instead) at byte offset ${byteOffset}`,
    );
  }
  const count = reader.ReadUInt16(); //0x0002

  for (let i = 0; i < count; i++) {
    try {
      items.push(await readItem(reader, version, constants, config));
    } catch (error) {
      throw wrapParsingError(
        error,
        `Failed to read item ${i + 1} of ${count}`,
      );
    }
  }
  return items;
}

export async function writeItems(
  items: types.IItem[],
  version: number,
  constants: types.IConstantData,
  config: types.IConfig,
): Promise<Uint8Array> {
  const writer = new BitWriter();
  writer.WriteString('JM', 2);
  writer.WriteUInt16(items.length);
  for (let i = 0; i < items.length; i++) {
    writer.WriteArray(await writeItem(items[i], version, constants, config));
  }
  return writer.ToArray();
}

export async function readItem(
  reader: BitReader,
  version: number,
  originalConstants: types.IConstantData,
  config: types.IConfig,
  _parent?: types.IItem,
): Promise<types.IItem> {
  const itemStartOffset = reader.offset;
  const item = {
    offset: itemStartOffset,
  } as types.IItem;

  try {
    if (version <= 0x60) {
      const header = reader.ReadString(2); //0x0000 [item header = 0x4a, 0x4d "JM"]
      if (header !== 'JM') {
        const byteOffset = Math.floor((reader.offset - 2 * 8) / 8);
        throw new Error(
          `Item header 'JM' not found (found '${header}' instead) at byte offset ${byteOffset}`,
        );
      }
    }
    const constants = originalConstants;

    try {
      _readSimpleBits(item, reader, version, constants, config);
    } catch (error) {
      throw wrapParsingError(
        error,
        `Failed to read item flags and basic properties at byte offset ${Math.floor(itemStartOffset / 8)}`,
      );
    }
    if (!item.simple_item) {
    item.id = reader.ReadUInt32(32);
    item.level = reader.ReadUInt8(7);
    item.quality = reader.ReadUInt8(4);
    item.multiple_pictures = reader.ReadBit();
    if (item.multiple_pictures) {
      item.picture_id = reader.ReadUInt8(3);
    }
    item.class_specific = reader.ReadBit();
    if (item.class_specific) {
      item.auto_affix_id = reader.ReadUInt16(11);
    }

    // Parse quality-specific data
    try {
      switch (item.quality) {
        case Quality.Low:
          item.low_quality_id = reader.ReadUInt8(3);
          break;
        case Quality.Normal:
          {
            // sometimes normal items have 12 bits here...
            // maybe when they have magical properties?
            const bits = reader.ReadUInt16(12);
            // TODO: I have no idea if this is always 0
            if (bits === 0) {
              item.normal_12_bits = bits;
            } else {
              // assume these are properties instead
              item.normal_12_bits = null;
              reader.SkipBits(-12);
            }
          }
          break;
        case Quality.Superior:
          item.file_index = reader.ReadUInt8(3);
          break;
        case Quality.Magic:
          item.magic_prefix = reader.ReadUInt16(11);
          if (item.magic_prefix)
            item.magic_prefix_name = constants.magic_prefixes[item.magic_prefix]
              ? constants.magic_prefixes[item.magic_prefix].n
              : null;
          item.magic_suffix = reader.ReadUInt16(11);
          if (item.magic_suffix)
            item.magic_suffix_name = constants.magic_suffixes[item.magic_suffix]
              ? constants.magic_suffixes[item.magic_suffix].n
              : null;
          break;
        case Quality.Set:
          item.set_id = reader.ReadUInt16(12);
          item.set_name = constants.set_items[item.set_id]
            ? constants.set_items[item.set_id].n
            : null;
          break;
        case Quality.Unique:
          item.unique_id = reader.ReadUInt16(12);
          item.unique_name = constants.unq_items[item.unique_id]
            ? constants.unq_items[item.unique_id].n
            : null;
          break;
        case Quality.Rare:
        case Quality.Crafted:
          item.rare_name_id = reader.ReadUInt8(8);
          if (item.rare_name_id)
            item.rare_name = constants.rare_names[item.rare_name_id]
              ? constants.rare_names[item.rare_name_id].n
              : null;
          item.rare_name_id2 = reader.ReadUInt8(8);
          if (item.rare_name_id2)
            item.rare_name2 = constants.rare_names[item.rare_name_id2]
              ? constants.rare_names[item.rare_name_id2].n
              : null;
          item.magical_name_ids = [];
          for (let i = 0; i < 6; i++) {
            const prefix = reader.ReadBit();
            if (prefix === 1) {
              item.magical_name_ids[i] = reader.ReadUInt16(11);
            } else {
              item.magical_name_ids[i] = null;
            }
          }
          break;
        default:
          break;
      }
    } catch (error) {
      const qualityNames = ['Unknown', 'Low', 'Normal', 'Superior', 'Magic', 'Set', 'Rare', 'Unique', 'Crafted'];
      const qualityName = qualityNames[item.quality] || `Unknown(${item.quality})`;
      throw wrapParsingError(
        error,
        `Failed to read quality-specific data for ${qualityName} quality item`,
      );
    }
    if (item.given_runeword) {
      item.runeword_id = reader.ReadUInt16(12);
      // TODO: stop parsing runeword_name here
      //fix delerium on d2gs??? why is this a thing?
      if (item.runeword_id == 2718) {
        item.runeword_id = 48;
      }
      if (item.runeword_id == 2786) {
        item.runeword_id = 173;
      }
      if (constants.runewords[item.runeword_id]) {
        item.runeword_name = constants.runewords[item.runeword_id]!.n!;
      }
      // TODO: why are we skipping 4 bits?
      reader.ReadUInt8(4);
    }

    if (item.personalized) {
      const arr = new Uint8Array(16);
      for (let i = 0; i < arr.length; i++) {
        if (version > 0x61) {
          arr[i] = reader.ReadUInt8(8);
        } else {
          arr[i] = reader.ReadUInt8(7);
        }
        if (arr[i] === 0x00) {
          break;
        }
      }
      item.personalized_name = new BitReader(arr)
        .ReadString(16)
        .trim()
        .replace(/\0/g, '');
    }

    //tomes
    if (item.type === 'tbk' || item.type == 'ibk') {
      reader.ReadUInt8(5);
    }

    //realm data
    item.timestamp = reader.ReadUInt8(1);

    if (item.type_id === ItemType.Armor) {
      item.defense_rating =
        reader.ReadUInt16(constants.magical_properties[31].sB) -
        constants.magical_properties[31].sA;
    }
    if (item.type_id === ItemType.Armor || item.type_id === ItemType.Weapon) {
      item.max_durability =
        reader.ReadUInt16(constants.magical_properties[73].sB) -
        constants.magical_properties[73].sA;
      if (item.max_durability > 0) {
        item.current_durability =
          reader.ReadUInt16(constants.magical_properties[72].sB) -
          constants.magical_properties[72].sA;
      }
    }

    if (constants.stackables[item.type]) {
      item.quantity = reader.ReadUInt16(9);
    }

    if (item.socketed === 1) {
      item.total_nr_of_sockets = reader.ReadUInt8(4);
    }

    /**
     * 5 bits. any of the 5 bits can be set. if a bit is set that means
     * means +1 to the set_list_count
     */
    let plist_flag = 0;
    if (item.quality === Quality.Set) {
      plist_flag = reader.ReadUInt8(5);
      item.set_list_count = 0;
      item._unknown_data.plist_flag = plist_flag;
    }

      //magical properties
      try {
        let magic_attributes = _readMagicProperties(reader, constants);
        item.magic_attributes = magic_attributes;

        while (plist_flag > 0) {
          if (plist_flag & 1) {
            item.set_list_count += 1;
            magic_attributes = _readMagicProperties(reader, constants);
            if (item.set_attributes) {
              item.set_attributes.push(magic_attributes);
            } else {
              item.set_attributes = [magic_attributes];
            }
          }
          plist_flag >>>= 1;
        }

        if (item.given_runeword === 1) {
          magic_attributes = _readMagicProperties(reader, constants);
          if (magic_attributes && magic_attributes.length > 0) {
            item.runeword_attributes = magic_attributes;
          }
        }
      } catch (error) {
        throw wrapParsingError(
          error,
          `Failed to read magical properties for ${formatItemContext(item)}`,
        );
      }
    }
    reader.Align();

    if (item.nr_of_items_in_sockets > 0 && item.simple_item === 0) {
      item.socketed_items = [];
      for (let i = 0; i < item.nr_of_items_in_sockets; i++) {
        try {
          item.socketed_items.push(
            await readItem(reader, version, constants, config, item),
          );
        } catch (error) {
          throw wrapParsingError(
            error,
            `Failed to read socketed item ${i + 1} of ${item.nr_of_items_in_sockets} in ${formatItemContext(item)}`,
          );
        }
      }
    }
    return item;
  } catch (error) {
    throw wrapParsingError(
      error,
      `Failed to parse ${formatItemContext(item)}`,
    );
  }
}

export async function writeItem(
  item: types.IItem,
  version: number,
  constants: types.IConstantData,
  config: types.IConfig,
): Promise<Uint8Array> {
  if (item._unknown_data === undefined) {
    item._unknown_data = {};
  }
  if (item.categories === undefined) {
    item.categories = _GetItemTXT(item, constants)?.c;
  }

  const writer = new BitWriter();
  if (version <= 0x60) {
    writer.WriteString('JM', 2);
  }
  _writeSimpleBits(writer, version, item, constants, config);
  if (!item.simple_item) {
    writer.WriteUInt32(item.id, 32);
    writer.WriteUInt8(item.level, 7);
    writer.WriteUInt8(item.quality, 4);
    writer.WriteUInt8(item.multiple_pictures, 1);
    if (item.multiple_pictures) {
      writer.WriteUInt8(item.picture_id, 3);
    }
    writer.WriteUInt8(item.class_specific, 1);
    if (item.class_specific === 1) {
      writer.WriteUInt16(item.auto_affix_id || 0, 11);
    }
    switch (item.quality) {
      case Quality.Low:
        writer.WriteUInt8(item.low_quality_id, 3);
        break;
      case Quality.Normal:
        if (item.normal_12_bits != null) {
          writer.WriteUInt16(item.normal_12_bits, 12);
        }
        break;
      case Quality.Superior:
        writer.WriteUInt8(item.file_index || 0, 3);
        break;
      case Quality.Magic:
        writer.WriteUInt16(item.magic_prefix, 11);
        writer.WriteUInt16(item.magic_suffix, 11);
        break;
      case Quality.Set:
        writer.WriteUInt16(item.set_id, 12);
        break;
      case Quality.Unique:
        writer.WriteUInt16(item.unique_id, 12);
        break;
      case Quality.Rare:
      case Quality.Crafted:
        writer.WriteUInt8(
          item.rare_name_id !== undefined
            ? item.rare_name_id
            : _lookupRareId(item.rare_name, constants),
          8,
        );
        writer.WriteUInt8(
          item.rare_name_id2 !== undefined
            ? item.rare_name_id2
            : _lookupRareId(item.rare_name2, constants),
          8,
        );
        for (let i = 0; i < 6; i++) {
          const magical_name_id = item.magical_name_ids[i];
          if (magical_name_id) {
            writer.WriteBit(1);
            writer.WriteUInt16(magical_name_id, 11);
          } else {
            writer.WriteBit(0);
          }
        }
        break;
      default:
        break;
    }

    if (item.given_runeword) {
      //fix delerium on d2gs??? why is this a thing?
      let runeword_id = item.runeword_id;
      if (runeword_id == 2718) {
        runeword_id = 48;
      }
      writer.WriteUInt16(runeword_id, 12);
      writer.WriteUInt8(5, 4); //always 5?
    }

    if (item.personalized) {
      const name = item.personalized_name.substring(0, 16);
      for (let i = 0; i < name.length; i++) {
        if (version > 0x61) {
          writer.WriteUInt8(name.charCodeAt(i), 8);
        } else {
          writer.WriteUInt8(name.charCodeAt(i) & 0x7f, 7);
        }
      }
      writer.WriteUInt8(0x00, version > 0x61 ? 8 : 7);
    }

    if (item.type === 'tbk') {
      writer.WriteUInt8(0, 5);
    } else if (item.type === 'ibk') {
      writer.WriteUInt8(1, 5);
    }

    writer.WriteUInt8(item.timestamp, 1);

    if (item.type_id === ItemType.Armor || item.type_id === ItemType.Shield) {
      writer.WriteUInt16(
        item.defense_rating + constants.magical_properties[31].sA,
        constants.magical_properties[31].sB,
      );
    }

    if (
      item.type_id === ItemType.Armor ||
      item.type_id === ItemType.Shield ||
      item.type_id === ItemType.Weapon
    ) {
      writer.WriteUInt16(
        item.max_durability || 0,
        constants.magical_properties[73].sB,
      );
      if (item.max_durability > 0) {
        writer.WriteUInt16(
          item.current_durability,
          constants.magical_properties[72].sB,
        );
      }
    }

    if (constants.stackables[item.type]) {
      writer.WriteUInt16(item.quantity, 9);
    }

    if (item.socketed === 1) {
      writer.WriteUInt8(item.total_nr_of_sockets, 4);
    }

    if (item.quality === Quality.Set) {
      const set_attribute_count =
        item.set_attributes != null ? item.set_attributes.length : 0;
      //reduced by -1 removed as this seems to be wrong
      const plist_flag = (1 << set_attribute_count) - 1;
      writer.WriteUInt8(item._unknown_data.plist_flag || plist_flag, 5);
    }

    _writeMagicProperties(writer, item.magic_attributes, constants);
    if (item.set_attributes && item.set_attributes.length > 0) {
      for (let i = 0; i < item.set_attributes.length; i++) {
        _writeMagicProperties(writer, item.set_attributes[i], constants);
      }
    }

    if (item.given_runeword === 1) {
      _writeMagicProperties(writer, item.runeword_attributes, constants);
    }
  }

  writer.Align();

  if (item.nr_of_items_in_sockets > 0 && item.simple_item === 0) {
    for (let i = 0; i < item.nr_of_items_in_sockets; i++) {
      writer.WriteArray(
        await writeItem(item.socketed_items[i], version, constants, config),
      );
    }
  }
  return writer.ToArray();
}

function _readSimpleBits(
  item: types.IItem,
  reader: BitReader,
  version: number,
  constants: types.IConstantData,
  _config: types.IConfig,
) {
  //init so we do not have npe's
  item._unknown_data = {};
  //1.10-1.14d
  //[flags:32][version:10][mode:3]([invloc:4][x:4][y:4][page:3])([itemcode:32])([sockets:3])
  //1.15
  //[flags:32][version:3][mode:3]([invloc:4][x:4][y:4][page:3])([itemcode:variable])([sockets:3])
  item._unknown_data.b0_3 = reader.ReadBitArray(4);
  item.identified = reader.ReadBit();
  item._unknown_data.b5_10 = reader.ReadBitArray(6);
  item.socketed = reader.ReadBit();
  item._unknown_data.b12 = reader.ReadBitArray(1);
  item.new = reader.ReadBit();
  item._unknown_data.b14_15 = reader.ReadBitArray(2);
  item.is_ear = reader.ReadBit();
  item.starter_item = reader.ReadBit();
  item._unknown_data.b18_20 = reader.ReadBitArray(3);
  item.simple_item = reader.ReadBit();
  item.ethereal = reader.ReadBit();
  item._unknown_data.b23 = reader.ReadBitArray(1);
  item.personalized = reader.ReadBit();
  item._unknown_data.b25 = reader.ReadBitArray(1);
  item.given_runeword = reader.ReadBit();
  item._unknown_data.b27_31 = reader.ReadBitArray(5);

  if (version <= 0x60) {
    item.version = reader.ReadUInt16(10).toString(10);
  } else if (version >= 0x61) {
    item.version = reader.ReadUInt16(3).toString(2);
  }
  item.location_id = reader.ReadUInt8(3);
  item.equipped_id = reader.ReadUInt8(4);
  item.position_x = reader.ReadUInt8(4);
  item.position_y = reader.ReadUInt8(4);
  item.alt_position_id = reader.ReadUInt8(3);
  if (item.is_ear) {
    const clazz = reader.ReadUInt8(3);
    const level = reader.ReadUInt8(7);
    const arr = new Uint8Array(15);
    for (let i = 0; i < arr.length; i++) {
      arr[i] = reader.ReadUInt8(7);
      if (arr[i] === 0x00) {
        break;
      }
    }
    const name = new BitReader(arr).ReadString(15).trim().replace(/\0/g, '');
    item.ear_attributes = {
      class: clazz,
      level: level,
      name: name,
    } as types.IEarAttributes;
  } else {
    if (version <= 0x60) {
      item.type = reader.ReadString(4);
    } else if (version >= 0x61) {
      item.type = '';
      //props to d07riv
      //https://github.com/d07RiV/d07riv.github.io/blob/master/d2r.html#L11-L20
      for (let i = 0; i < 4; i++) {
        let node = HUFFMAN as any;
        do {
          node = node[reader.ReadBit()];
        } while (Array.isArray(node));
        item.type += node;
      }
    }
    item.type = item.type.trim().replace(/\0/g, '');
    let details = _GetItemTXT(item, constants);
    item.categories = details?.c;
    if (item?.categories?.includes('Any Armor')) {
      item.type_id = ItemType.Armor;
    } else if (item?.categories?.includes('Weapon')) {
      item.type_id = ItemType.Weapon;
      details = constants.weapon_items[item.type];
    } else {
      item.type_id = ItemType.Other;
    }

    let bits = item.simple_item ? 1 : 3;
    if (item.categories?.includes('Quest')) {
      item.quest_difficulty =
        reader.ReadUInt16(constants.magical_properties[356].sB) -
        constants.magical_properties[356].sA;
      bits = 1;
    }
    item.nr_of_items_in_sockets = reader.ReadUInt8(bits);
  }
}

function _lookupRareId(name: string, constants: types.IConstantData): number {
  //some inconsistencies with txt data and nokka. so have to hack it with startsWith
  return constants.rare_names.findIndex(
    (k) =>
      k &&
      (k.n.toLowerCase().startsWith(name.toLowerCase()) ||
        name.toLowerCase().startsWith(k.n.toLowerCase())),
  );
}

function _writeSimpleBits(
  writer: BitWriter,
  version: number,
  item: types.IItem,
  constants: types.IConstantData,
  _config: types.IConfig,
) {
  writer.WriteBits(item._unknown_data.b0_3 || new Uint8Array(4), 4);
  writer.WriteBit(item.identified);
  writer.WriteBits(item._unknown_data.b5_10 || new Uint8Array(6), 6);
  writer.WriteBit(item.socketed);
  writer.WriteBits(item._unknown_data.b12 || new Uint8Array(1), 1);
  writer.WriteBit(item.new);
  writer.WriteBits(item._unknown_data.b14_15 || new Uint8Array(2), 2);
  writer.WriteBit(item.is_ear);
  writer.WriteBit(item.starter_item);
  writer.WriteBits(item._unknown_data.b18_20 || new Uint8Array(3), 3);
  writer.WriteBit(item.simple_item);
  writer.WriteBit(item.ethereal);
  writer.WriteBits(item._unknown_data.b23 || new Uint8Array([1]), 1); //always 1? IFLAG_JUSTSAVED
  writer.WriteBit(item.personalized);
  writer.WriteBits(item._unknown_data.b25 || new Uint8Array(1), 1); //IFLAG_LOWQUALITY
  writer.WriteBit(item.given_runeword);
  writer.WriteBits(item._unknown_data.b27_31 || new Uint8Array(5), 5);

  const itemVersion = item.version != null ? item.version : '101';
  if (version <= 0x60) {
    // 0 = pre-1.08; 1 = 1.08/1.09 normal; 2 = 1.10 normal; 100 = 1.08/1.09 expansion; 101 = 1.10 expansion
    writer.WriteUInt16(parseInt(itemVersion, 10), 10);
  } else if (version >= 0x61) {
    writer.WriteUInt16(parseInt(itemVersion, 2), 3);
  }
  writer.WriteUInt8(item.location_id, 3);
  writer.WriteUInt8(item.equipped_id, 4);
  writer.WriteUInt8(item.position_x, 4);
  writer.WriteUInt8(item.position_y, 4);
  writer.WriteUInt8(item.alt_position_id, 3);
  if (item.is_ear) {
    writer.WriteUInt8(item.ear_attributes.class, 3);
    writer.WriteUInt8(item.ear_attributes.level, 7);
    const name = item.ear_attributes.name.substring(0, 15);
    for (let i = 0; i < name.length; i++) {
      writer.WriteUInt8(name.charCodeAt(i) & 0x7f, 7);
    }
    writer.WriteUInt8(0x00, 7);
  } else {
    const t = item.type.padEnd(4, ' ');
    if (version <= 0x60) {
      writer.WriteString(t, 4);
    } else {
      for (const c of t) {
        const n = HUFFMAN_LOOKUP[c as keyof typeof HUFFMAN_LOOKUP];
        writer.WriteUInt16(n.v, n.l);
      }
    }

    let bits = item.simple_item ? 1 : 3;
    if (item.categories?.includes('Quest')) {
      const difficulty = item.quest_difficulty || 0;
      writer.WriteUInt16(
        difficulty + constants.magical_properties[356].sA,
        constants.magical_properties[356].sB,
      );
      bits = 1;
    }
    writer.WriteUInt8(item.nr_of_items_in_sockets, bits);
  }
}

export function _readMagicProperties(
  reader: BitReader,
  constants: types.IConstantData,
) {
  let id = reader.ReadUInt16(9);
  const magic_attributes = [];
  while (id != 0x1ff) {
    const values = [];
    const propertyStartOffset = reader.offset - 9;
    const byteOffset = Math.floor(propertyStartOffset / 8);

    if (constants.magical_properties[id] == null) {
      throw new Error(
        `Stat ID ${id} is not defined in itemstatcost.txt (attempted to read at byte offset ${byteOffset}). This may indicate corrupted save data or unsupported game version.`,
      );
    }

    try {
      const num_of_properties = constants.magical_properties[id].np || 1;
      for (let i = 0; i < num_of_properties; i++) {
        const prop = constants.magical_properties[id + i];
        if (prop == null) {
          const currentByteOffset = Math.floor(reader.offset / 8);
          throw new Error(
            `Stat ID ${id + i} is not defined in itemstatcost.txt (property ${i + 1} of ${num_of_properties} for stat ${id} at byte offset ${currentByteOffset})`,
          );
        }
        if (prop.sP) {
          let param = reader.ReadUInt16(prop.sP);
          switch (prop.dF) {
            case 14: //+skill to skilltab
              values.push(param & 0x7);
              param = (param >> 3) & 0x1fff;
              break;
            default:
              break;
          }
          //encode
          switch (prop.e) {
            case 1:
              //throw new Error(`Unimplemented encoding: ${prop.encode}`);
              break;
            case 2: //chance to cast
            case 3: //charges
              values.push(param & 0x3f); //skill level
              param = (param >> 6) & 0x3ff; //skll id
              break;
            default:
              break;
          }
          values.push(param);
        }
        if (!prop.sB) {
          throw new Error(
            `Stat "${prop.s}" (ID: ${id}) is missing "Save Bits" field in itemstatcost.txt. This indicates corrupted or incomplete game data.`,
          );
        }
        let v = reader.ReadUInt16(prop.sB);
        if (prop.sA) {
          v -= prop.sA;
        }
        switch (prop.e) {
          case 3:
            values.push(v & 0xff); // current charges
            values.push((v >> 8) & 0xff); //max charges
            break;
          default:
            values.push(v);
            break;
        }
      }
      magic_attributes.push({
        id: id,
        values: values,
        name: constants.magical_properties[id].s,
      } as types.IMagicProperty);
    } catch (error) {
      const statName = constants.magical_properties[id]?.s || `Unknown(${id})`;
      throw wrapParsingError(
        error,
        `Failed to read magical property '${statName}' (stat ID: ${id}) starting at byte offset ${byteOffset}`,
      );
    }
    id = reader.ReadUInt16(9);
  }
  return magic_attributes;
}

export function _writeMagicProperties(
  writer: BitWriter,
  properties: types.IMagicProperty[],
  constants: types.IConstantData,
) {
  if (properties) {
    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];
      let valueIdx = 0;
      writer.WriteUInt16(property.id, 9);
      const num_of_properties =
        constants.magical_properties[property!.id].np || 1;
      for (let j = 0; j < num_of_properties; j++) {
        const prop = constants.magical_properties[property!.id + j];
        if (prop == null) {
          throw new Error(
            `Cannot find Magical Property for id: ${property.id}`,
          );
        }
        if (prop.sP) {
          let param = property.values[valueIdx++]!;
          switch (prop.dF) {
            case 14: //+skill to skilltab
              param |= (property.values[valueIdx++]! & 0x1fff) << 3;
              break;
            default:
              break;
          }
          //encode
          switch (prop.e) {
            case 1:
              //throw new Error(`Unimplemented encoding: ${prop.encode}`);
              break;
            case 2: //chance to cast
            case 3: //charges
              param |= (property.values[valueIdx++]! & 0x3ff) << 6;
              break;
            default:
              break;
          }
          writer.WriteUInt32(param, prop.sP);
        }
        let v = property.values[valueIdx++]!;
        if (prop.sA) {
          v += prop.sA;
        }
        switch (prop.e) {
          case 3:
            v |= (property.values[valueIdx++]! & 0xff) << 8;
            break;
          default:
            break;
        }
        if (!prop.sB) {
          throw new Error(
            `Save Bits is undefined for stat: ${property.id}:${prop.s}`,
          );
        }
        writer.WriteUInt32(v, prop.sB);
      }
    }
  }
  writer.WriteUInt16(0x1ff, 9);
}

function _GetItemTXT(item: types.IItem, constants: types.IConstantData): any {
  if (constants.armor_items[item.type]) {
    return constants.armor_items[item.type];
  } else if (constants.weapon_items[item.type]) {
    return constants.weapon_items[item.type];
  } else if (constants.other_items[item.type]) {
    return constants.other_items[item.type];
  }
}
