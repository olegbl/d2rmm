import type * as types from 'bridge/third-party/d2s/d2/types.d';
import { BitReader } from '../binary/bitreader';
import { BitWriter } from '../binary/bitwriter';

export async function readSkills(
  char: types.ID2S,
  reader: BitReader,
  constants: types.IConstantData,
) {
  char.skills = [] as types.ISkill[];
  const offset = SkillOffset[char.header.class];
  const header = reader.ReadString(2); //0x0000 [skills header = 0x69, 0x66 "if"]
  if (header !== 'if') {
    // header is not present in first save after char is created
    if (char.header.level === 1) {
      return; // TODO: return starter skills based on class
    }

    throw new Error(
      `Skills header 'if' not found at position ${reader.offset - 2 * 8}`,
    );
  }
  for (let i = 0; i < 30; i++) {
    const id = offset + i;
    char.skills.push({
      id: id,
      points: reader.ReadUInt8(),
      name: constants.skills[id].s,
    } as types.ISkill);
  }
}

export async function writeSkills(
  char: types.ID2S,
  _constants: types.IConstantData,
): Promise<Uint8Array> {
  const writer = new BitWriter();
  writer.WriteString('if', 2); //0x0000 [skills header = 0x69, 0x66 "if"]
  //probably array length checking/sorting of skills by id...
  for (let i = 0; i < 30; i++) {
    writer.WriteUInt8(char.skills[i].points);
  }
  return writer.ToArray();
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
};
