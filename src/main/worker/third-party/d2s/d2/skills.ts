import type * as types from 'bridge/third-party/d2s/d2/types.d';
import { BitReader } from '../binary/bitreader';
import { BitWriter } from '../binary/bitwriter';
import { wrapParsingError, formatCharContext } from './errors';

export async function readSkills(
  char: types.ID2S,
  reader: BitReader,
  constants: types.IConstantData,
) {
  try {
    char.skills = [] as types.ISkill[];
    const offset = SkillOffset[char.header.class];

    if (offset === undefined) {
      throw new Error(
        `Unknown character class '${char.header.class}'. Valid classes: ${Object.keys(SkillOffset).join(', ')}`,
      );
    }

    const header = reader.ReadString(2); //0x0000 [skills header = 0x69, 0x66 "if"]
    if (header !== 'if') {
      // header is not present in first save after char is created
      if (char.header.level === 1) {
        return; // TODO: return starter skills based on class
      }

      const byteOffset = Math.floor((reader.offset - 2 * 8) / 8);
      throw new Error(
        `Skills header 'if' not found (found '${header}' instead) at byte offset ${byteOffset}`,
      );
    }

    for (let i = 0; i < 30; i++) {
      const id = offset + i;
      try {
        const points = reader.ReadUInt8();
        const skillData = constants.skills[id];
        if (!skillData) {
          throw new Error(
            `Skill ID ${id} not found in skills.txt (skill ${i + 1} of 30 for ${char.header.class})`,
          );
        }
        char.skills.push({
          id: id,
          points: points,
          name: skillData.s,
        } as types.ISkill);
      } catch (error) {
        throw wrapParsingError(
          error,
          `Failed to read skill ${i + 1} of 30 (ID: ${id})`,
        );
      }
    }
  } catch (error) {
    throw wrapParsingError(
      error,
      `Failed to read skills for ${formatCharContext(char)}`,
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
    if (!char.skills || char.skills.length < 30) {
      throw new Error(
        `Character must have exactly 30 skills, but found ${char.skills?.length || 0}`,
      );
    }
    for (let i = 0; i < 30; i++) {
      writer.WriteUInt8(char.skills[i].points);
    }
    return writer.ToArray();
  } catch (error) {
    throw wrapParsingError(
      error,
      `Failed to write skills for ${formatCharContext(char)}`,
    );
  }
}

interface ISkillOffset {
  [key: string]: number;
}

const SkillOffset: ISkillOffset = {
  Amazon: 6,
  Sorceress: 36,
  Necromancer: 66,
  Paladin: 96,
  Barbarian: 126,
  Druid: 221,
  Assassin: 251,
  Warlock: 373,
};
