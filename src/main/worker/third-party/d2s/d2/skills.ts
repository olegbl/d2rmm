import type * as types from 'bridge/third-party/d2s/d2/types.d';
import { te } from '../../../../../shared/i18n';
import { BitReader } from '../binary/bitreader';
import { BitWriter } from '../binary/bitwriter';
import { formatCharContext } from './errors';

export async function readSkills(
  char: types.ID2S,
  reader: BitReader,
  constants: types.IConstantData,
) {
  try {
    char.skills = [] as types.ISkill[];
    const characterClassCode = constants.classes[char.header.class_id].c;
    const offset = constants.skills.findIndex(
      (skill) => skill && skill.c === characterClassCode,
    );
    const skillCount = constants.skills.filter(
      (skill) => skill && skill.c === characterClassCode,
    ).length;

    if (offset === -1 || skillCount === 0) {
      const characterClass = constants.classes[char.header.class_id].n;
      throw te('d2s.parse.skills.classNotFound', {
        class: characterClass,
        code: characterClassCode,
      });
    }

    const header = reader.ReadString(2); //0x0000 [skills header = 0x69, 0x66 "if"]
    if (header !== 'if') {
      // header is not present in first save after char is created
      if (char.header.level === 1) {
        return; // TODO: return starter skills based on class
      }

      const byteOffset = Math.floor((reader.offset - 2 * 8) / 8);
      throw te('d2s.parse.skills.headerNotFound', {
        found: header,
        offset: byteOffset,
      });
    }

    for (let i = 0; i < skillCount; i++) {
      const id = offset + i;
      try {
        const points = reader.ReadUInt8();
        char.skills.push({ id, points } as types.ISkill);
      } catch (error) {
        throw te(
          'd2s.parse.skills.readSkillFailed',
          {
            index: i + 1,
            count: skillCount,
            id,
          },
          error,
        );
      }
    }
  } catch (error) {
    throw te(
      'd2s.parse.skills.readFailed',
      {
        char: formatCharContext(char),
      },
      error,
    );
  }
}

export async function writeSkills(
  char: types.ID2S,
  _constants: types.IConstantData,
): Promise<Uint8Array> {
  try {
    const writer = new BitWriter();
    writer.WriteString('if', 2); //0x0000 [skills header = 0x69, 0x66 "if"]
    //probably array length checking/sorting of skills by id...
    if (!char.skills || char.skills.length === 0) {
      throw te('d2s.parse.skills.noSkills');
    }
    for (let i = 0; i < char.skills.length; i++) {
      writer.WriteUInt8(char.skills[i].points);
    }
    return writer.ToArray();
  } catch (error) {
    throw te(
      'd2s.parse.skills.writeFailed',
      {
        char: formatCharContext(char),
      },
      error,
    );
  }
}
