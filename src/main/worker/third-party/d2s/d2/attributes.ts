import type * as types from 'bridge/third-party/d2s/d2/types.d';
import { te } from '../../../../../shared/i18n';
import { BitReader } from '../binary/bitreader';
import { BitWriter } from '../binary/bitwriter';
import { formatCharContext } from './errors';

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
        const classData = constants.classes[char.header.class_id];

        if (!classData) {
          throw te('d2s.parse.attrs.classNotFound', {
            class: char.header.class_id,
          });
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
      throw te('d2s.parse.attrs.headerNotFound', {
        found: header,
        offset: byteOffset,
        char: formatCharContext(char),
      });
    }
    char.header.attributes_order = [];
    let id = reader.ReadUInt16(9);
    //read till 0x1ff end of attributes is found
    while (id != 0x1ff) {
      char.header.attributes_order.push(id);
      const field = constants.magical_properties[id];
      if (field === undefined) {
        const byteOffset = Math.floor((reader.offset - 9) / 8);
        throw te('d2s.parse.attrs.invalidStatId', {
          id,
          offset: byteOffset,
          char: formatCharContext(char),
        });
      }
      const size = field.cB;
      try {
        char.attributes[Attributes[field.s as keyof typeof Attributes]] =
          reader.ReadUInt32(size);
        //current_hp - max_stamina need to be bit shifted
        if (id >= 6 && id <= 11) {
          char.attributes[Attributes[field.s as keyof typeof Attributes]] /=
            256;
        }
      } catch (error) {
        throw te(
          'd2s.parse.attrs.readAttrFailed',
          {
            attr: field.s,
            id,
          },
          error,
        );
      }
      // bitoffset += size;
      id = reader.ReadUInt16(9);
    }

    reader.Align();
  } catch (error) {
    throw te(
      'd2s.parse.attrs.readFailed',
      {
        char: formatCharContext(char),
      },
      error,
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
    const order = [...(char.header.attributes_order ?? [])];
    const writtenIds = new Set<number>();

    // Add any attributes that are missing in order
    for (let i = 0; i < 16; i++) {
      if (!order.includes(i)) {
        order.push(i);
      }
    }

    // Write in the order stats appeared in the file, preserving explicit zeros
    for (const i of order) {
      const property = constants.magical_properties[i];
      if (property === undefined) {
        throw te('d2s.parse.attrs.unknownWriteStatId', { id: i });
      }
      let value =
        char.attributes[Attributes[property.s as keyof typeof Attributes]];
      if (value == null) {
        continue;
      }
      writtenIds.add(i);
      const size = property.cB;
      if (i >= 6 && i <= 11) {
        value = Math.round(value * 256);
      }
      writer.WriteUInt16(i, 9);
      writer.WriteUInt32(value, size);
    }

    writer.WriteUInt16(0x1ff, 9);
    writer.Align();
    return writer.ToArray();
  } catch (error) {
    throw te(
      'd2s.parse.attrs.writeFailed',
      {
        char: formatCharContext(char),
      },
      error,
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
