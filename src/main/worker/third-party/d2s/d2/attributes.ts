import type * as types from 'bridge/third-party/d2s/d2/types.d';
import { BitReader } from '../binary/bitreader';
import { BitWriter } from '../binary/bitwriter';
import { wrapParsingError, formatCharContext } from './errors';

//todo use constants.magical_properties and csvBits
export async function readAttributes(
  char: types.ID2S,
  reader: BitReader,
  constants: types.IConstantData,
) {
  try {
    char.attributes = {} as types.IAttributes;
    const header = reader.ReadString(2); //0x0000 [attributes header = 0x67, 0x66 "gf"]
    if (header != 'gf') {
      // header is not present in first save after char is created
      if (char.header.level === 1) {
        const classData = constants.classes.find(
          (c) => c.n === char.header.class,
        )?.a;

        if (!classData) {
          throw new Error(
            `Cannot find class data for class '${char.header.class}'. Class may not be supported.`,
          );
        }

        char.attributes = {
          strength: +classData.str,
          energy: +classData.int,
          dexterity: +classData.dex,
          vitality: +classData.vit,
          unused_stats: 0,
          unused_skill_points: 0,
          current_hp: +classData.vit + +classData.hpadd,
          max_hp: +classData.vit + +classData.hpadd,
          current_mana: +classData.int,
          max_mana: +classData.int,
          current_stamina: +classData.stam,
          max_stamina: +classData.stam,
          level: 1,
          experience: 0,
          gold: 0,
          stashed_gold: 0,
        };

        return;
      }

      const byteOffset = Math.floor((reader.offset - 2 * 8) / 8);
      throw new Error(
        `Attribute header 'gf' not found (found '${header}' instead) at byte offset ${byteOffset}. ${formatCharContext(char)}`,
      );
    }
    // let bitoffset = 0;
    let id = reader.ReadUInt16(9);
    //read till 0x1ff end of attributes is found
    while (id != 0x1ff) {
      // bitoffset += 9;
      const field = constants.magical_properties[id];
      if (field === undefined) {
        const byteOffset = Math.floor((reader.offset - 9) / 8);
        throw new Error(
          `Invalid attribute stat ID ${id} at byte offset ${byteOffset}. This stat ID is not defined in itemstatcost.txt. ${formatCharContext(char)}`,
        );
      }
      const size = field.cB;
      try {
        char.attributes[Attributes[field.s as keyof typeof Attributes]] =
          reader.ReadUInt32(size);
        //current_hp - max_stamina need to be bit shifted
        if (id >= 6 && id <= 11) {
          char.attributes[Attributes[field.s as keyof typeof Attributes]] >>>=
            8;
        }
      } catch (error) {
        throw wrapParsingError(
          error,
          `Failed to read attribute '${field.s}' (ID: ${id})`,
        );
      }
      // bitoffset += size;
      id = reader.ReadUInt16(9);
    }

    reader.Align();
  } catch (error) {
    throw wrapParsingError(
      error,
      `Failed to read character attributes for ${formatCharContext(char)}`,
    );
  }
}

export async function writeAttributes(
  char: types.ID2S,
  constants: types.IConstantData,
): Promise<Uint8Array> {
  try {
    const writer = new BitWriter();
    writer.WriteString('gf', 2); //0x0000 [attributes header = 0x67, 0x66 "gf"]
    for (let i = 0; i < 16; i++) {
      const property = constants.magical_properties[i];
      if (property === undefined) {
        throw new Error(
          `Cannot write attribute: stat ID ${i} is not defined in itemstatcost.txt`,
        );
      }
      let value =
        char.attributes[Attributes[property.s as keyof typeof Attributes]];
      if (!value) {
        continue;
      }
      const size = property.cB;
      if (i >= 6 && i <= 11) {
        value <<= 8;
      }
      writer.WriteUInt16(i, 9);
      writer.WriteUInt32(value, size);
    }
    writer.WriteUInt16(0x1ff, 9);
    writer.Align();
    return writer.ToArray();
  } catch (error) {
    throw wrapParsingError(
      error,
      `Failed to write character attributes for ${formatCharContext(char)}`,
    );
  }
}

//nokkas names
const Attributes = {
  strength: 'strength',
  energy: 'energy',
  dexterity: 'dexterity',
  vitality: 'vitality',
  statpts: 'unused_stats',
  newskills: 'unused_skill_points',
  hitpoints: 'current_hp',
  maxhp: 'max_hp',
  mana: 'current_mana',
  maxmana: 'max_mana',
  stamina: 'current_stamina',
  maxstamina: 'max_stamina',
  level: 'level',
  experience: 'experience',
  gold: 'gold',
  goldbank: 'stashed_gold',
};
