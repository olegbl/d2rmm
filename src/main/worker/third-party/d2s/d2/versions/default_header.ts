import type * as types from 'bridge/third-party/d2s/d2/types.d';
import { BitReader } from '../../binary/bitreader';
import { BitWriter } from '../../binary/bitwriter';
import { DEBUG_D2S, extractRawBytes } from '../debug';

const difficulties = ['normal', 'nm', 'hell'];

export function readHeader(
  char: types.ID2S,
  reader: BitReader,
  constants: types.IConstantData,
) {
  if (DEBUG_D2S) {
    char.header.hex = extractRawBytes(reader, reader.offset, 300);
  }

  // [ v1+ v98+ v105+ ]

  // [ 0x0008 0x0008 0x0008 ]
  char.header.filesize = reader.ReadUInt32();

  // [ 0x000c 0x000c 0x000c ]
  char.header.checksum = reader.ReadUInt32().toString(16).padStart(8, '0');

  // [ 0x0010 0x0010 0x0010 ]
  reader.SkipBytes(0x4); // TODO: NO SKIPPING

  if (char.header.version >= 0x69) {
    // no bits here
  } else if (char.header.version >= 0x62) {
    // 0x0014
    reader.SkipBytes(0x10); // TODO: NO SKIPPING
  } else {
    // 0x0010
    char.header.name = reader.ReadString(0x10).replace(/\0/g, '');
  }

  // [ 0x0024 0x0024 0x0014 ]
  char.header.status = _readStatus(reader.ReadUInt8());

  // [ 0x0025 0x0025 0x0015 ]
  char.header.progression = reader.ReadUInt8();

  // [ 0x0026 0x0026 0x0016 ]
  char.header.active_arms = reader.ReadUInt16(); //  0x0, 0x0

  // [ 0x0028 0x0028 0x0018 ]
  const classId = reader.ReadUInt8();

  const classData = constants.classes[classId];
  if (!classData) {
    throw new Error(
      `Invalid class ID ${classId} at byte position ${Math.floor(reader.offset / 8)}. ` +
        `This may indicate a parsing error due to incorrect file format for version ${char.header.version} (0x${char.header.version.toString(16)}). ` +
        `Valid class IDs are 0-${constants.classes.length - 1}.`,
    );
  }
  char.header.class = classData.n;

  // [ 0x0029 0x0029 0x0019 ]
  reader.SkipBytes(2); // 0x10, 0x1E // TODO: NO SKIPPING

  // [ 0x002b 0x002b 0x001b ]
  char.header.level = reader.ReadUInt8();

  // [ 0x002c 0x002c 0x001c ]
  char.header.created = reader.ReadUInt32();

  // [ 0x0030 0x0030 0x0020 ]
  char.header.last_played = reader.ReadUInt32();

  // [ 0x0034 0x0034 0x0024 ]
  reader.SkipBytes(4); // 0xff, 0xff, 0xff, 0xff // TODO: NO SKIPPING

  // [ 0x0038 0x0038 0x0028 ]
  const assignedSkillsResult = _readAssignedSkills(
    reader.ReadArray(64),
    constants,
  );
  char.header.assigned_skills = assignedSkillsResult.names;
  char.header.assigned_skill_ids = assignedSkillsResult.ids;

  // [ 0x0078 0x0078 0x0068 ]
  char.header.left_skill = constants.skills[reader.ReadUInt32()]?.s;

  // [ 0x007c 0x007c 0x006c ]
  char.header.right_skill = constants.skills[reader.ReadUInt32()]?.s;

  // [ 0x0080 0x0080 0x0070 ]
  char.header.left_swap_skill = constants.skills[reader.ReadUInt32()]?.s;

  // [ 0x0084 0x0084 0x0074 ]
  char.header.right_swap_skill = constants.skills[reader.ReadUInt32()]?.s;

  // [ 0x0088 0x0088 0x0078 ]
  char.header.menu_appearance = _readCharMenuAppearance(
    reader.ReadArray(32),
    constants,
  );

  // [ 0x00a8 0x00a8 0x0098 ]
  char.header.difficulty = _readDifficulty(reader.ReadArray(3));

  // [ 0x00ab 0x00ab 0x009b ]
  char.header.map_id = reader.ReadUInt32();

  // [ 0x00af 0x00af 0x009f ]
  reader.SkipBytes(2); // 0x0, 0x0 // TODO: NO SKIPPING

  // [ 0x00b1 0x00b1 0x00a1 ]
  char.header.dead_merc = reader.ReadUInt16();

  // [ 0x00b3 0x00b3 0x00a3 ]
  char.header.merc_id = reader.ReadUInt32().toString(16);

  // [ 0x00b7 0x00b7 0x00a7 ]
  char.header.merc_name_id = reader.ReadUInt16();

  // [ 0x00b9 0x00b9 0x00a9 ]
  char.header.merc_type = reader.ReadUInt16();

  // [ 0x00bb 0x00bb 0x00ab ]
  char.header.merc_experience = reader.ReadUInt32();

  if (char.header.version >= 0x69) {
    // 0x00af
    char.header.unknown_before_realm = reader.ReadBytes(0x49);
    // 0x00f8
    char.header.realm = reader.ReadUInt8(); // realm: 1=Classic, 2=LoD, 3=RotW
    // 0x00f9
    char.header.unknown_after_realm = reader.ReadBytes(0x32);
    // 0x012b
    char.header.name = reader.ReadString(0x10).replace(/\0/g, '');
    // 0x013b
    char.header.unknown_after_name = reader.ReadBytes(0x4);
  } else if (char.header.version >= 0x62) {
    // 0x00bf
    char.header.unknown_before_realm = reader.ReadBytes(0x49);
    // 0x0108
    char.header.realm = reader.ReadUInt8(); // realm: 1=Classic, 2=LoD, 3=RotW
    // 0x0109
    char.header.unknown_after_realm = reader.ReadBytes(0x2);
    // 0x010b
    char.header.name = reader.ReadString(0x10).replace(/\0/g, '');
    // 0x011b
    char.header.unknown_after_name = reader.ReadBytes(0x34);
  } else {
    // 0x00bf
    char.header.unknown_before_realm = reader.ReadBytes(0x49);
    // 0x0108
    char.header.realm = reader.ReadUInt8(); // realm: 1=Classic, 2=LoD, 3=RotW
    // 0x0109
    char.header.unknown_after_realm = reader.ReadBytes(0x46);
  }

  if (char.header.version >= 0x69) {
    // 0x02ed
    char.header.extended_header_data = reader.ReadBytes(0x54);
    // 0x0341
  }

  // [ 0x014f 0x014f 0x013f ]
  char.header.quests_header_magic = reader.ReadString(4); // "Woo!"

  // [ 0x0153 0x0153 0x0143 ]
  char.header.quests_header_version = reader.ReadUInt32();

  // [ 0x0157 0x0157 0x0147 ]
  char.header.quests_header_length = reader.ReadUInt16();

  // [ 0x0159 0x0159 0x0149 ]
  char.header.quests_normal = _readQuests(reader.ReadArray(96));

  // [ 0x01b9 0x01b9 0x01a9 ]
  char.header.quests_nm = _readQuests(reader.ReadArray(96));

  // [ 0x0219 0x0219 0x0209 ]
  char.header.quests_hell = _readQuests(reader.ReadArray(96));

  // [ 0x0279 0x0279 0x0269 ]
  char.header.waypoints_header_magic = reader.ReadString(2); // "WS"

  // [ 0x027b 0x027b 0x026b ]
  char.header.waypoints_header_version = reader.ReadUInt32();

  // [ 0x027f 0x027f 0x026f ]
  char.header.waypoints_header_length = reader.ReadUInt16();

  // [ 0x0281 0x0281 0x0271 ]
  char.header.waypoints = _readWaypointData(reader.ReadArray(0x48));

  // [ 0x02c9 0x02c9 0x02b9 ]
  char.header.npcs_header_magic = reader.ReadArray(2); // 0x01, 0x77 ".w"

  // [ 0x02cb 0x02cb 0x02bb ]
  char.header.npcs_header_length = reader.ReadUInt16();

  // [ 0x02cd 0x02cd 0x02bd ]
  char.header.npcs = _readNPCData(reader.ReadArray(0x30));
}

export function writeHeader(
  char: types.ID2S,
  writer: BitWriter,
  constants: types.IConstantData,
) {
  // [ v1+ v98+ v105+ ]

  // [ 0x0008 0x0008 0x0008 ]
  writer.WriteUInt32(0x0); // filesize, needs to be written after all data

  // [ 0x000c 0x000c 0x000c ]
  writer.WriteUInt32(0x0); // checksum, needs to be calculated after all data written

  // [ 0x0010 0x0010 0x0010 ]
  writer.WriteBytes(new Uint8Array(0x4));

  if (char.header.version >= 0x69) {
    // no bits here
  } else if (char.header.version >= 0x62) {
    // 0x0014
    writer.WriteBytes(new Uint8Array(0x10));
  } else {
    // 0x0014
    writer.WriteString(char.header.name, 0x10);
  }

  // [ 0x0024 0x0024 0x0014 ]
  writer.WriteArray(_writeStatus(char.header.status));

  // [ 0x0025 0x0025 0x0015 ]
  writer.WriteUInt8(char.header.progression);

  // [ 0x0026 0x0026 0x0016 ]
  writer.WriteUInt16(char.header.active_arms);

  // [ 0x0028 0x0028 0x0018 ]
  writer.WriteUInt8(_classId(char.header.class, constants));

  // [ 0x0029 0x0029 0x0019 ]
  writer.WriteArray(new Uint8Array([0x10, 0x1e]));

  // [ 0x002b 0x002b 0x001b ]
  writer.WriteUInt8(char.header.level);

  // [ 0x002c 0x002c 0x001c ]
  writer.WriteUInt32(char.header.created); // created

  // [ 0x0030 0x0030 0x0020 ]
  writer.WriteUInt32(char.header.last_played);

  // [ 0x0034 0x0034 0x0024 ]
  writer.WriteArray(new Uint8Array([0xff, 0xff, 0xff, 0xff]));

  // [ 0x0038 0x0038 0x0028 ]
  writer.WriteArray(
    _writeAssignedSkills(
      char.header.assigned_skills,
      char.header.assigned_skill_ids,
      constants,
    ),
  );

  // [ 0x0078 0x0078 0x0068 ]
  writer.WriteUInt32(_skillId(char.header.left_skill, constants));

  // [ 0x007c 0x007c 0x006c ]
  writer.WriteUInt32(_skillId(char.header.right_skill, constants));

  // [ 0x0080 0x0080 0x0070 ]
  writer.WriteUInt32(_skillId(char.header.left_swap_skill, constants));

  // [ 0x0084 0x0084 0x0074 ]
  writer.WriteUInt32(_skillId(char.header.right_swap_skill, constants));

  // [ 0x0088 0x0088 0x0078 ]
  writer.WriteArray(
    _writeCharMenuAppearance(char.header.menu_appearance, constants),
  );

  // [ 0x00a8 0x00a8 0x0098 ]
  writer.WriteArray(_writeDifficulty(char.header.difficulty));

  // [ 0x00ab 0x00ab 0x009b ]
  writer.WriteUInt32(char.header.map_id);

  // [ 0x00af 0x00af 0x009f ]
  writer.WriteArray(new Uint8Array([0x00, 0x00])); // 0x0, 0x0

  // [ 0x00b1 0x00b1 0x00a1 ]
  writer.WriteUInt16(char.header.dead_merc);

  // [ 0x00b3 0x00b3 0x00a3 ]
  writer.WriteUInt32(parseInt(char.header.merc_id, 16));

  // [ 0x00b7 0x00b7 0x00a7 ]
  writer.WriteUInt16(char.header.merc_name_id);

  // [ 0x00b9 0x00b9 0x00a9 ]
  writer.WriteUInt16(char.header.merc_type);

  // [ 0x00bb 0x00bb 0x00ab ]
  writer.WriteUInt32(char.header.merc_experience);

  if (char.header.version >= 0x69) {
    // 0x00af
    writer.WriteArray(char.header.unknown_before_realm ?? new Uint8Array(0x49));
    // 0x00f8
    writer.WriteUInt8(char.header.realm); // realm: 1=Classic, 2=LoD, 3=RotW
    // 0x00f9
    writer.WriteArray(char.header.unknown_after_realm ?? new Uint8Array(0x32));
    // 0x012b
    writer.WriteString(char.header.name, 0x10);
    // 0x013b
    writer.WriteArray(char.header.unknown_after_name ?? new Uint8Array(0x4));
  } else if (char.header.version >= 0x62) {
    // 0x00bf
    writer.WriteArray(char.header.unknown_before_realm ?? new Uint8Array(0x49));
    // 0x0108
    writer.WriteUInt8(char.header.realm); // realm: 1=Classic, 2=LoD, 3=RotW
    // 0x0109
    writer.WriteArray(char.header.unknown_after_realm ?? new Uint8Array(0x2));
    // 0x010b
    writer.WriteString(char.header.name, 0x10);
    // 0x011b
    writer.WriteArray(char.header.unknown_after_name ?? new Uint8Array(0x34));
  } else {
    // 0x00bf
    writer.WriteArray(char.header.unknown_before_realm ?? new Uint8Array(0x49));
    // 0x0108
    writer.WriteUInt8(char.header.realm); // realm: 1=Classic, 2=LoD, 3=RotW
    // 0x0109
    writer.WriteArray(char.header.unknown_after_realm ?? new Uint8Array(0x46));
  }

  if (char.header.version >= 0x69) {
    // 0x013f
    writer.WriteBytes(char.header.extended_header_data ?? new Uint8Array(0x54));
    // 0x01a8
  }

  // [ 0x014f 0x014f 0x01a8 ]
  writer.WriteString(char.header.quests_header_magic ?? 'Woo!', 4);

  // [ 0x0153 0x0153 0x01ac ]
  writer.WriteUInt32(char.header.quests_header_version ?? 0x06);

  // [ 0x0157 0x0157 0x01b0 ]
  writer.WriteUInt16(char.header.quests_header_length ?? 0x012a);

  // [ 0x0159 0x0159 0x01b2 ]
  writer.WriteArray(_writeQuests(char.header.quests_normal));

  // [ 0x01b9 0x01b9 0x0212 ]
  writer.WriteArray(_writeQuests(char.header.quests_nm));

  // [ 0x0219 0x0219 0x0272 ]
  writer.WriteArray(_writeQuests(char.header.quests_hell));

  // [ 0x0279 0x0279 0x02d2 ]
  writer.WriteString(char.header.waypoints_header_magic ?? 'WS', 2);

  // [ 0x027b 0x027b 0x02d4 ]
  writer.WriteUInt32(char.header.waypoints_header_version ?? 0x01);

  // [ 0x027f 0x027f 0x02d8 ]
  writer.WriteUInt16(char.header.waypoints_header_length ?? 0x50);

  // [ 0x0281 0x0281 0x02da ]
  writer.WriteArray(_writeWaypointData(char.header.waypoints));

  // [ 0x02c9 0x02c9 0x0322 ]
  writer.WriteBytes(
    char.header.npcs_header_magic ?? new Uint8Array([0x01, 0x77]),
  );

  // [ 0x02cb 0x02cb 0x0324 ]
  writer.WriteUInt16(char.header.npcs_header_length ?? 0x34);

  // [ 0x02cd 0x02cd 0x0326 ]
  writer.WriteArray(_writeNPCData(char.header.npcs));
}

function _classId(name: string, constants: types.IConstantData): number {
  if (!name) return -1;
  return constants.classes.findIndex((c) => c && c.n == name);
}

function _skillId(name: string, constants: types.IConstantData): number {
  //default to "attack" if empty string or can't find spellname.
  if (name === '') return 0;
  if (!name) return -1;
  const idx = constants.skills.findIndex((s) => s && s.s == name);
  return idx >= 0 ? idx : 0;
}

function _readStatus(byte: number): types.IStatus {
  const status = {} as types.IStatus;
  status.hardcore = ((byte >>> 2) & 1) === 1;
  status.died = ((byte >>> 3) & 1) === 1;
  status.expansion = ((byte >>> 5) & 1) === 1;
  status.ladder = ((byte >>> 6) & 1) === 1;
  return status;
}

function _writeStatus(status: types.IStatus): Uint8Array {
  const arr = new Uint8Array(1);
  arr[0] |= status.hardcore ? 1 << 2 : 0;
  arr[0] |= status.died ? 1 << 3 : 0;
  arr[0] |= status.expansion ? 1 << 5 : 0;
  arr[0] |= status.ladder ? 1 << 6 : 0;
  return arr;
}

function _readCharMenuAppearance(
  bytes: Uint8Array,
  _constants: types.IConstantData,
): types.ICharMenuAppearance {
  const appearance = {} as types.ICharMenuAppearance;
  const reader = new BitReader(bytes);
  const graphics = reader.ReadArray(16);
  const tints = reader.ReadArray(16);
  appearance.head = {
    graphic: graphics[0],
    tint: tints[0],
  } as types.IMenuAppearance;
  appearance.torso = {
    graphic: graphics[1],
    tint: tints[1],
  } as types.IMenuAppearance;
  appearance.legs = {
    graphic: graphics[2],
    tint: tints[2],
  } as types.IMenuAppearance;
  appearance.right_arm = {
    graphic: graphics[3],
    tint: tints[3],
  } as types.IMenuAppearance;
  appearance.left_arm = {
    graphic: graphics[4],
    tint: tints[4],
  } as types.IMenuAppearance;
  appearance.right_hand = {
    graphic: graphics[5],
    tint: tints[5],
  } as types.IMenuAppearance;
  appearance.left_hand = {
    graphic: graphics[6],
    tint: tints[6],
  } as types.IMenuAppearance;
  appearance.shield = {
    graphic: graphics[7],
    tint: tints[7],
  } as types.IMenuAppearance;
  appearance.special1 = {
    graphic: graphics[8],
    tint: tints[8],
  } as types.IMenuAppearance;
  appearance.special2 = {
    graphic: graphics[9],
    tint: tints[9],
  } as types.IMenuAppearance;
  appearance.special3 = {
    graphic: graphics[10],
    tint: tints[10],
  } as types.IMenuAppearance;
  appearance.special4 = {
    graphic: graphics[11],
    tint: tints[11],
  } as types.IMenuAppearance;
  appearance.special5 = {
    graphic: graphics[12],
    tint: tints[12],
  } as types.IMenuAppearance;
  appearance.special6 = {
    graphic: graphics[13],
    tint: tints[13],
  } as types.IMenuAppearance;
  appearance.special7 = {
    graphic: graphics[14],
    tint: tints[14],
  } as types.IMenuAppearance;
  appearance.special8 = {
    graphic: graphics[15],
    tint: tints[15],
  } as types.IMenuAppearance;
  return appearance;
}

function _writeCharMenuAppearance(
  appearance: types.ICharMenuAppearance,
  _constants: types.IConstantData,
): Uint8Array {
  const writer = new BitWriter(32);
  writer.length = 32 * 8;

  const graphics: number[] = [];
  graphics.push(appearance && appearance.head ? appearance.head.graphic : 0);
  graphics.push(appearance && appearance.torso ? appearance.torso.graphic : 0);
  graphics.push(appearance && appearance.legs ? appearance.legs.graphic : 0);
  graphics.push(
    appearance && appearance.right_arm ? appearance.right_arm.graphic : 0,
  );
  graphics.push(
    appearance && appearance.left_arm ? appearance.left_arm.graphic : 0,
  );
  graphics.push(
    appearance && appearance.right_hand ? appearance.right_hand.graphic : 0,
  );
  graphics.push(
    appearance && appearance.left_hand ? appearance.left_hand.graphic : 0,
  );
  graphics.push(
    appearance && appearance.shield ? appearance.shield.graphic : 0,
  );
  graphics.push(
    appearance && appearance.special1 ? appearance.special1.graphic : 0,
  );
  graphics.push(
    appearance && appearance.special2 ? appearance.special2.graphic : 0,
  );
  graphics.push(
    appearance && appearance.special3 ? appearance.special3.graphic : 0,
  );
  graphics.push(
    appearance && appearance.special4 ? appearance.special4.graphic : 0,
  );
  graphics.push(
    appearance && appearance.special5 ? appearance.special5.graphic : 0,
  );
  graphics.push(
    appearance && appearance.special6 ? appearance.special6.graphic : 0,
  );
  graphics.push(
    appearance && appearance.special7 ? appearance.special7.graphic : 0,
  );
  graphics.push(
    appearance && appearance.special8 ? appearance.special8.graphic : 0,
  );

  for (const g of graphics) {
    writer.WriteUInt8(g);
  }

  const tints: number[] = [];
  tints.push(appearance && appearance.head ? appearance.head.tint : 0);
  tints.push(appearance && appearance.torso ? appearance.torso.tint : 0);
  tints.push(appearance && appearance.legs ? appearance.legs.tint : 0);
  tints.push(
    appearance && appearance.right_arm ? appearance.right_arm.tint : 0,
  );
  tints.push(appearance && appearance.left_arm ? appearance.left_arm.tint : 0);
  tints.push(
    appearance && appearance.right_hand ? appearance.right_hand.tint : 0,
  );
  tints.push(
    appearance && appearance.left_hand ? appearance.left_hand.tint : 0,
  );
  tints.push(appearance && appearance.shield ? appearance.shield.tint : 0);
  tints.push(appearance && appearance.special1 ? appearance.special1.tint : 0);
  tints.push(appearance && appearance.special2 ? appearance.special2.tint : 0);
  tints.push(appearance && appearance.special3 ? appearance.special3.tint : 0);
  tints.push(appearance && appearance.special4 ? appearance.special4.tint : 0);
  tints.push(appearance && appearance.special5 ? appearance.special5.tint : 0);
  tints.push(appearance && appearance.special6 ? appearance.special6.tint : 0);
  tints.push(appearance && appearance.special7 ? appearance.special7.tint : 0);
  tints.push(appearance && appearance.special8 ? appearance.special8.tint : 0);

  for (const t of tints) {
    writer.WriteUInt8(t);
  }
  return writer.ToArray();
}

function _readAssignedSkills(
  bytes: Uint8Array,
  constants: types.IConstantData,
): { names: string[]; ids: number[] } {
  const names = [] as string[];
  const ids = [] as number[];
  const reader = new BitReader(bytes);
  for (let i = 0; i < 16; i++) {
    const skillId = reader.ReadUInt32();
    ids.push(skillId);
    const skill = constants.skills[skillId];
    if (skill) {
      names.push(skill.s);
    }
  }
  return { names, ids };
}

function _writeAssignedSkills(
  skills: string[],
  skillIds: number[] | undefined,
  constants: types.IConstantData,
): Uint8Array {
  const writer = new BitWriter(64);
  writer.length = 64 * 8;
  skills = skills || [];
  for (let i = 0; i < 16; i++) {
    if (skillIds != null && i < skillIds.length) {
      // Use the raw stored ID for faithful round-tripping
      writer.WriteUInt32(skillIds[i]);
    } else {
      // Fall back to name lookup (for mods that set assigned_skills directly)
      const skillId = _skillId(skills[i], constants);
      writer.WriteUInt32(skillId > 0 ? skillId : 0xffffffff);
    }
  }

  return writer.ToArray();
}

function _readDifficulty(bytes: Uint8Array): types.IDifficulty {
  const difficulty = {} as types.IDifficulty;
  difficulty.Normal = bytes[0];
  difficulty.Nightmare = bytes[1];
  difficulty.Hell = bytes[2];
  return difficulty;
}

function _writeDifficulty(difficulty: types.IDifficulty): Uint8Array {
  const writer = new BitWriter(3);
  writer.length = 3 * 8;
  writer.WriteUInt8(difficulty.Normal);
  writer.WriteUInt8(difficulty.Nightmare);
  writer.WriteUInt8(difficulty.Hell);
  return writer.ToArray();
}

function _readQuests(bytes: Uint8Array): types.IQuests {
  const reader = new BitReader(bytes);
  const quests = {} as types.IQuests;

  quests.act_i = {} as types.IActIQuests;
  quests.act_i.introduced = reader.ReadUInt16(); // 0x0000
  quests.act_i.den_of_evil = _readQuest(reader.ReadArray(2)); // 0x0002
  quests.act_i.sisters_burial_grounds = _readQuest(reader.ReadArray(2));
  quests.act_i.tools_of_the_trade = _readQuest(reader.ReadArray(2));
  quests.act_i.the_search_for_cain = _readQuest(reader.ReadArray(2));
  quests.act_i.the_forgotten_tower = _readQuest(reader.ReadArray(2));
  quests.act_i.sisters_to_the_slaughter = _readQuest(reader.ReadArray(2));
  quests.act_i.completed = reader.ReadUInt16();

  quests.act_ii = {} as types.IActIIQuests;
  quests.act_ii.introduced = reader.ReadUInt16(); // 0x0010 [if jerhyn introduction = 0x01]
  quests.act_ii.radaments_lair = _readQuest(reader.ReadArray(2)); // 0x0012
  quests.act_ii.the_horadric_staff = _readQuest(reader.ReadArray(2));
  quests.act_ii.tainted_sun = _readQuest(reader.ReadArray(2));
  quests.act_ii.arcane_sanctuary = _readQuest(reader.ReadArray(2));
  quests.act_ii.the_summoner = _readQuest(reader.ReadArray(2));
  quests.act_ii.the_seven_tombs = _readQuest(reader.ReadArray(2));
  quests.act_ii.completed = reader.ReadUInt16(); // 0x001e

  quests.act_iii = {} as types.IActIIIQuests;
  quests.act_iii.introduced = reader.ReadUInt16(); // 0x0020 [if hratli introduction = 0x01]
  quests.act_iii.lam_esens_tome = _readQuest(reader.ReadArray(2)); // 0x0022
  quests.act_iii.khalims_will = _readQuest(reader.ReadArray(2));
  quests.act_iii.blade_of_the_old_religion = _readQuest(reader.ReadArray(2));
  quests.act_iii.the_golden_bird = _readQuest(reader.ReadArray(2));
  quests.act_iii.the_blackened_temple = _readQuest(reader.ReadArray(2));
  quests.act_iii.the_guardian = _readQuest(reader.ReadArray(2));
  quests.act_iii.completed = reader.ReadUInt16(); // 0x002e

  quests.act_iv = {} as types.IActIVQuests;
  quests.act_iv.introduced = reader.ReadUInt16(); // 0x0030 [if activ introduction = 0x01]
  quests.act_iv.the_fallen_angel = _readQuest(reader.ReadArray(2)); // 0x0032
  quests.act_iv.terrors_end = _readQuest(reader.ReadArray(2));
  quests.act_iv.hellforge = _readQuest(reader.ReadArray(2));
  quests.act_iv.completed = reader.ReadUInt16(); // 0x0038

  quests.unknown_act_iv_v_gap = reader.ReadBytes(10); // 0x003a

  quests.act_v = {} as types.IActVQuests;
  quests.act_v.introduced = reader.ReadUInt16();
  quests.act_v.siege_on_harrogath = _readQuest(reader.ReadArray(2)); // 0x0046
  quests.act_v.rescue_on_mount_arreat = _readQuest(reader.ReadArray(2));
  quests.act_v.prison_of_ice = _readQuest(reader.ReadArray(2));
  quests.act_v.betrayal_of_harrogath = _readQuest(reader.ReadArray(2));
  quests.act_v.rite_of_passage = _readQuest(reader.ReadArray(2));
  quests.act_v.eve_of_destruction = _readQuest(reader.ReadArray(2));
  quests.act_v.completed = reader.ReadUInt16(); // raw UInt16 — bitmask, not a simple boolean

  quests.unknown_trailing = reader.ReadBytes(12);

  return quests; //sizeof [0x0060]
}

function _writeQuests(quests: types.IQuests): Uint8Array {
  const writer = new BitWriter(96);
  writer.length = 96 * 8;

  writer.WriteUInt16(quests.act_i.introduced ?? 0);
  writer.WriteArray(_writeQuest(quests.act_i.den_of_evil));
  writer.WriteArray(_writeQuest(quests.act_i.sisters_burial_grounds));
  writer.WriteArray(_writeQuest(quests.act_i.tools_of_the_trade));
  writer.WriteArray(_writeQuest(quests.act_i.the_search_for_cain));
  writer.WriteArray(_writeQuest(quests.act_i.the_forgotten_tower));
  writer.WriteArray(_writeQuest(quests.act_i.sisters_to_the_slaughter));
  writer.WriteUInt16(quests.act_i.completed);

  writer.WriteUInt16(quests.act_ii.introduced);
  writer.WriteArray(_writeQuest(quests.act_ii.radaments_lair));
  writer.WriteArray(_writeQuest(quests.act_ii.the_horadric_staff));
  writer.WriteArray(_writeQuest(quests.act_ii.tainted_sun));
  writer.WriteArray(_writeQuest(quests.act_ii.arcane_sanctuary));
  writer.WriteArray(_writeQuest(quests.act_ii.the_summoner));
  writer.WriteArray(_writeQuest(quests.act_ii.the_seven_tombs));
  writer.WriteUInt16(quests.act_ii.completed);

  writer.WriteUInt16(quests.act_iii.introduced);
  writer.WriteArray(_writeQuest(quests.act_iii.lam_esens_tome));
  writer.WriteArray(_writeQuest(quests.act_iii.khalims_will));
  writer.WriteArray(_writeQuest(quests.act_iii.blade_of_the_old_religion));
  writer.WriteArray(_writeQuest(quests.act_iii.the_golden_bird));
  writer.WriteArray(_writeQuest(quests.act_iii.the_blackened_temple));
  writer.WriteArray(_writeQuest(quests.act_iii.the_guardian));
  writer.WriteUInt16(quests.act_iii.completed);

  writer.WriteUInt16(quests.act_iv.introduced);
  writer.WriteArray(_writeQuest(quests.act_iv.the_fallen_angel));
  writer.WriteArray(_writeQuest(quests.act_iv.terrors_end));
  writer.WriteArray(_writeQuest(quests.act_iv.hellforge));
  writer.WriteUInt16(quests.act_iv.completed);

  writer.WriteBytes(quests.unknown_act_iv_v_gap ?? new Uint8Array(10));

  writer.WriteUInt16(quests.act_v.introduced);
  writer.WriteArray(_writeQuest(quests.act_v.siege_on_harrogath));
  writer.WriteArray(_writeQuest(quests.act_v.rescue_on_mount_arreat));
  writer.WriteArray(_writeQuest(quests.act_v.prison_of_ice));
  writer.WriteArray(_writeQuest(quests.act_v.betrayal_of_harrogath));
  writer.WriteArray(_writeQuest(quests.act_v.rite_of_passage));
  writer.WriteArray(_writeQuest(quests.act_v.eve_of_destruction));
  writer.WriteUInt16(quests.act_v.completed);

  writer.WriteBytes(quests.unknown_trailing ?? new Uint8Array(12));

  return writer.ToArray();
}

function _readQuest(bytes: Uint8Array): types.IQuest {
  const quest = {} as types.IQuest;
  const reader = new BitReader(bytes);
  quest.is_completed = reader.ReadBit() === 1;
  quest.is_requirement_completed = reader.ReadBit() === 1;
  quest.is_received = reader.ReadBit() === 1;
  quest.unk3 = reader.ReadBit() === 1;
  quest.unk4 = reader.ReadBit() === 1;
  quest.unk5 = reader.ReadBit() === 1;
  quest.unk6 = reader.ReadBit() === 1;
  quest.consumed_scroll = reader.ReadBit() === 1;
  quest.unk8 = reader.ReadBit() === 1;
  quest.unk9 = reader.ReadBit() === 1;
  quest.unk10 = reader.ReadBit() === 1;
  quest.unk11 = reader.ReadBit() === 1;
  quest.closed = reader.ReadBit() === 1;
  quest.done_recently = reader.ReadBit() === 1;
  quest.unk14 = reader.ReadBit() === 1;
  quest.unk15 = reader.ReadBit() === 1;
  return quest;
}

function _writeQuest(quest: types.IQuest): Uint8Array {
  const writer = new BitWriter(2);
  writer.length = 2 * 8;
  writer.WriteBit(+quest.is_completed);
  writer.WriteBit(+quest.is_requirement_completed);
  writer.WriteBit(+quest.is_received);
  writer.WriteBit(+quest.unk3);
  writer.WriteBit(+quest.unk4);
  writer.WriteBit(+quest.unk5);
  writer.WriteBit(+quest.unk6);
  writer.WriteBit(+quest.consumed_scroll);
  writer.WriteBit(+quest.unk8);
  writer.WriteBit(+quest.unk9);
  writer.WriteBit(+quest.unk10);
  writer.WriteBit(+quest.unk11);
  writer.WriteBit(+quest.closed);
  writer.WriteBit(+quest.done_recently);
  writer.WriteBit(+quest.unk14);
  writer.WriteBit(+quest.unk15);
  return writer.ToArray();
}

function _readWaypointData(bytes: Uint8Array): types.IWaypointData {
  const waypoints = {} as types.IWaypointData;
  const reader = new BitReader(bytes);
  for (let i = 0; i < difficulties.length; i++) {
    waypoints[difficulties[i] as keyof typeof waypoints] = _readWaypoints(
      reader.ReadArray(24),
    );
  }
  return waypoints;
}

function _readWaypoints(bytes: Uint8Array): types.IWaypoints {
  const reader = new BitReader(bytes);
  const waypoints = {} as types.IWaypoints;

  waypoints.unknown_header = reader.ReadBytes(2);

  waypoints.act_i = {} as types.IActIWaypoints;
  waypoints.act_i.rogue_encampement = reader.ReadBit() === 1;
  waypoints.act_i.cold_plains = reader.ReadBit() === 1;
  waypoints.act_i.stony_field = reader.ReadBit() === 1;
  waypoints.act_i.dark_woods = reader.ReadBit() === 1;
  waypoints.act_i.black_marsh = reader.ReadBit() === 1;
  waypoints.act_i.outer_cloister = reader.ReadBit() === 1;
  waypoints.act_i.jail_lvl_1 = reader.ReadBit() === 1;
  waypoints.act_i.inner_cloister = reader.ReadBit() === 1;
  waypoints.act_i.catacombs_lvl_2 = reader.ReadBit() === 1;

  waypoints.act_ii = {} as types.IActIIWaypoints;
  waypoints.act_ii.lut_gholein = reader.ReadBit() === 1;
  waypoints.act_ii.sewers_lvl_2 = reader.ReadBit() === 1;
  waypoints.act_ii.dry_hills = reader.ReadBit() === 1;
  waypoints.act_ii.halls_of_the_dead_lvl_2 = reader.ReadBit() === 1;
  waypoints.act_ii.far_oasis = reader.ReadBit() === 1;
  waypoints.act_ii.lost_city = reader.ReadBit() === 1;
  waypoints.act_ii.palace_cellar_lvl_1 = reader.ReadBit() === 1;
  waypoints.act_ii.arcane_sanctuary = reader.ReadBit() === 1;
  waypoints.act_ii.canyon_of_the_magi = reader.ReadBit() === 1;

  waypoints.act_iii = {} as types.IActIIIWaypoints;
  waypoints.act_iii.kurast_docks = reader.ReadBit() === 1;
  waypoints.act_iii.spider_forest = reader.ReadBit() === 1;
  waypoints.act_iii.great_marsh = reader.ReadBit() === 1;
  waypoints.act_iii.flayer_jungle = reader.ReadBit() === 1;
  waypoints.act_iii.lower_kurast = reader.ReadBit() === 1;
  waypoints.act_iii.kurast_bazaar = reader.ReadBit() === 1;
  waypoints.act_iii.upper_kurast = reader.ReadBit() === 1;
  waypoints.act_iii.travincal = reader.ReadBit() === 1;
  waypoints.act_iii.durance_of_hate_lvl_2 = reader.ReadBit() === 1;

  waypoints.act_iv = {} as types.IActIVWaypoints;
  waypoints.act_iv.the_pandemonium_fortress = reader.ReadBit() === 1;
  waypoints.act_iv.city_of_the_damned = reader.ReadBit() === 1;
  waypoints.act_iv.river_of_flame = reader.ReadBit() === 1;

  waypoints.act_v = {} as types.IActVWaypoints;
  waypoints.act_v.harrogath = reader.ReadBit() === 1;
  waypoints.act_v.frigid_highlands = reader.ReadBit() === 1;
  waypoints.act_v.arreat_plateau = reader.ReadBit() === 1;
  waypoints.act_v.crystalline_passage = reader.ReadBit() === 1;
  waypoints.act_v.halls_of_pain = reader.ReadBit() === 1;
  waypoints.act_v.glacial_trail = reader.ReadBit() === 1;
  waypoints.act_v.frozen_tundra = reader.ReadBit() === 1;
  waypoints.act_v.the_ancients_way = reader.ReadBit() === 1;
  waypoints.act_v.worldstone_keep_lvl_2 = reader.ReadBit() === 1;

  reader.Align();

  waypoints.unknown_trailing = reader.ReadBytes(17);

  return waypoints;
}

function _writeWaypointData(waypoints: types.IWaypointData): Uint8Array {
  const writer = new BitWriter(72);
  writer.length = 72 * 8;

  for (let i = 0; i < difficulties.length; i++) {
    const difficultyWaypoints =
      waypoints[difficulties[i] as keyof typeof waypoints];
    writer.WriteArray(_writeWaypoints(difficultyWaypoints));
  }

  return writer.ToArray();
}

function _writeWaypoints(waypoints: types.IWaypoints): Uint8Array {
  const writer = new BitWriter(24);
  writer.length = 24 * 8;

  writer.WriteBytes(waypoints.unknown_header ?? new Uint8Array([0x02, 0x01]));

  writer.WriteBit(+waypoints.act_i.rogue_encampement);
  writer.WriteBit(+waypoints.act_i.cold_plains);
  writer.WriteBit(+waypoints.act_i.stony_field);
  writer.WriteBit(+waypoints.act_i.dark_woods);
  writer.WriteBit(+waypoints.act_i.black_marsh);
  writer.WriteBit(+waypoints.act_i.outer_cloister);
  writer.WriteBit(+waypoints.act_i.jail_lvl_1);
  writer.WriteBit(+waypoints.act_i.inner_cloister);
  writer.WriteBit(+waypoints.act_i.catacombs_lvl_2);

  writer.WriteBit(+waypoints.act_ii.lut_gholein);
  writer.WriteBit(+waypoints.act_ii.sewers_lvl_2);
  writer.WriteBit(+waypoints.act_ii.dry_hills);
  writer.WriteBit(+waypoints.act_ii.halls_of_the_dead_lvl_2);
  writer.WriteBit(+waypoints.act_ii.far_oasis);
  writer.WriteBit(+waypoints.act_ii.lost_city);
  writer.WriteBit(+waypoints.act_ii.palace_cellar_lvl_1);
  writer.WriteBit(+waypoints.act_ii.arcane_sanctuary);
  writer.WriteBit(+waypoints.act_ii.canyon_of_the_magi);

  writer.WriteBit(+waypoints.act_iii.kurast_docks);
  writer.WriteBit(+waypoints.act_iii.spider_forest);
  writer.WriteBit(+waypoints.act_iii.great_marsh);
  writer.WriteBit(+waypoints.act_iii.flayer_jungle);
  writer.WriteBit(+waypoints.act_iii.lower_kurast);
  writer.WriteBit(+waypoints.act_iii.kurast_bazaar);
  writer.WriteBit(+waypoints.act_iii.upper_kurast);
  writer.WriteBit(+waypoints.act_iii.travincal);
  writer.WriteBit(+waypoints.act_iii.durance_of_hate_lvl_2);

  writer.WriteBit(+waypoints.act_iv.the_pandemonium_fortress);
  writer.WriteBit(+waypoints.act_iv.city_of_the_damned);
  writer.WriteBit(+waypoints.act_iv.river_of_flame);

  writer.WriteBit(+waypoints.act_v.harrogath);
  writer.WriteBit(+waypoints.act_v.frigid_highlands);
  writer.WriteBit(+waypoints.act_v.arreat_plateau);
  writer.WriteBit(+waypoints.act_v.crystalline_passage);
  writer.WriteBit(+waypoints.act_v.halls_of_pain);
  writer.WriteBit(+waypoints.act_v.glacial_trail);
  writer.WriteBit(+waypoints.act_v.frozen_tundra);
  writer.WriteBit(+waypoints.act_v.the_ancients_way);
  writer.WriteBit(+waypoints.act_v.worldstone_keep_lvl_2);

  writer.Align();

  writer.WriteBytes(waypoints.unknown_trailing ?? new Uint8Array(17));

  return writer.ToArray();
}

function _readNPCData(bytes: Uint8Array): types.INPCData {
  const npcs = { normal: {}, nm: {}, hell: {} } as types.INPCData;
  const reader = new BitReader(bytes);
  for (let j = 0; j < 3; j++) {
    npcs[difficulties[j] as keyof typeof npcs] = {
      warriv_act_ii: { intro: false, congrats: false },
      charsi: { intro: false, congrats: false },
      warriv_act_i: { intro: false, congrats: false },
      kashya: { intro: false, congrats: false },
      akara: { intro: false, congrats: false },
      gheed: { intro: false, congrats: false },
      greiz: { intro: false, congrats: false },
      jerhyn: { intro: false, congrats: false },
      meshif_act_ii: { intro: false, congrats: false },
      geglash: { intro: false, congrats: false },
      lysnader: { intro: false, congrats: false },
      fara: { intro: false, congrats: false },
      drogan: { intro: false, congrats: false },
      alkor: { intro: false, congrats: false },
      hratli: { intro: false, congrats: false },
      ashera: { intro: false, congrats: false },
      cain_act_iii: { intro: false, congrats: false },
      elzix: { intro: false, congrats: false },
      malah: { intro: false, congrats: false },
      anya: { intro: false, congrats: false },
      natalya: { intro: false, congrats: false },
      meshif_act_iii: { intro: false, congrats: false },
      ormus: { intro: false, congrats: false },
      cain_act_v: { intro: false, congrats: false },
      qualkehk: { intro: false, congrats: false },
      nihlathak: { intro: false, congrats: false },
    } as types.INPCS;
  }
  //introductions
  for (let i = 0; i < 3; i++) {
    const j = i * 5;
    const npc = npcs[difficulties[i] as keyof typeof npcs];
    npc.warriv_act_ii.intro = reader.bits[0 + j * 8] === 1;
    npc.charsi.intro = reader.bits[2 + j * 8] === 1;
    npc.warriv_act_i.intro = reader.bits[3 + j * 8] === 1;
    npc.kashya.intro = reader.bits[4 + j * 8] === 1;
    npc.akara.intro = reader.bits[5 + j * 8] === 1;
    npc.gheed.intro = reader.bits[6 + j * 8] === 1;
    npc.greiz.intro = reader.bits[8 + j * 8] === 1;
    npc.jerhyn.intro = reader.bits[9 + j * 8] === 1;
    npc.meshif_act_ii.intro = reader.bits[10 + j * 8] === 1;
    npc.geglash.intro = reader.bits[11 + j * 8] === 1;
    npc.lysnader.intro = reader.bits[12 + j * 8] === 1;
    npc.fara.intro = reader.bits[13 + j * 8] === 1;
    npc.drogan.intro = reader.bits[14 + j * 8] === 1;
    npc.alkor.intro = reader.bits[16 + j * 8] === 1;
    npc.hratli.intro = reader.bits[17 + j * 8] === 1;
    npc.ashera.intro = reader.bits[18 + j * 8] === 1;
    npc.cain_act_iii.intro = reader.bits[21 + j * 8] === 1;
    npc.elzix.intro = reader.bits[23 + j * 8] === 1;
    npc.malah.intro = reader.bits[24 + j * 8] === 1;
    npc.anya.intro = reader.bits[25 + j * 8] === 1;
    npc.natalya.intro = reader.bits[27 + j * 8] === 1;
    npc.meshif_act_iii.intro = reader.bits[28 + j * 8] === 1;
    npc.ormus.intro = reader.bits[31 + j * 8] === 1;
    npc.cain_act_v.intro = reader.bits[37 + j * 8] === 1;
    npc.qualkehk.intro = reader.bits[38 + j * 8] === 1;
    npc.nihlathak.intro = reader.bits[39 + j * 8] === 1;
  }
  //congrats
  for (let i = 0; i < 3; i++) {
    const j = i * 5;
    const npc = npcs[difficulties[i] as keyof typeof npcs];
    npc.warriv_act_ii.congrats = reader.bits[192 + (0 + j * 8)] === 1;
    npc.charsi.congrats = reader.bits[192 + (2 + j * 8)] === 1;
    npc.warriv_act_i.congrats = reader.bits[192 + (3 + j * 8)] === 1;
    npc.kashya.congrats = reader.bits[192 + (4 + j * 8)] === 1;
    npc.akara.congrats = reader.bits[192 + (5 + j * 8)] === 1;
    npc.gheed.congrats = reader.bits[192 + (6 + j * 8)] === 1;
    npc.greiz.congrats = reader.bits[192 + (8 + j * 8)] === 1;
    npc.jerhyn.congrats = reader.bits[192 + (9 + j * 8)] === 1;
    npc.meshif_act_ii.congrats = reader.bits[192 + (10 + j * 8)] === 1;
    npc.geglash.congrats = reader.bits[192 + (11 + j * 8)] === 1;
    npc.lysnader.congrats = reader.bits[192 + (12 + j * 8)] === 1;
    npc.fara.congrats = reader.bits[192 + (13 + j * 8)] === 1;
    npc.drogan.congrats = reader.bits[192 + (14 + j * 8)] === 1;
    npc.alkor.congrats = reader.bits[192 + (16 + j * 8)] === 1;
    npc.hratli.congrats = reader.bits[192 + (17 + j * 8)] === 1;
    npc.ashera.congrats = reader.bits[192 + (18 + j * 8)] === 1;
    npc.cain_act_iii.congrats = reader.bits[192 + (21 + j * 8)] === 1;
    npc.elzix.congrats = reader.bits[192 + (23 + j * 8)] === 1;
    npc.malah.congrats = reader.bits[192 + (24 + j * 8)] === 1;
    npc.anya.congrats = reader.bits[192 + (25 + j * 8)] === 1;
    npc.natalya.congrats = reader.bits[192 + (27 + j * 8)] === 1;
    npc.meshif_act_iii.congrats = reader.bits[192 + (28 + j * 8)] === 1;
    npc.ormus.congrats = reader.bits[192 + (31 + j * 8)] === 1;
    npc.cain_act_v.congrats = reader.bits[192 + (37 + j * 8)] === 1;
    npc.qualkehk.congrats = reader.bits[192 + (38 + j * 8)] === 1;
    npc.nihlathak.congrats = reader.bits[192 + (39 + j * 8)] === 1;
  }
  return npcs;
}

function _writeNPCData(npcs: types.INPCData): Uint8Array {
  const writer = new BitWriter(0x30);
  writer.length = 0x30 * 8;
  if (npcs) {
    for (let j = 0; j < 3; j++) {
      const npc = npcs[difficulties[j] as keyof typeof npcs];
      writer.SeekByte(j * 5);
      writer.WriteBit(+npc.warriv_act_ii.intro);
      writer.WriteBit(0);
      writer.WriteBit(+npc.charsi.intro);
      writer.WriteBit(+npc.warriv_act_i.intro);
      writer.WriteBit(+npc.kashya.intro);
      writer.WriteBit(+npc.akara.intro);
      writer.WriteBit(+npc.gheed.intro);
      writer.WriteBit(0);
      writer.WriteBit(+npc.greiz.intro);
      writer.WriteBit(+npc.jerhyn.intro);
      writer.WriteBit(+npc.meshif_act_ii.intro);
      writer.WriteBit(+npc.geglash.intro);
      writer.WriteBit(+npc.lysnader.intro);
      writer.WriteBit(+npc.fara.intro);
      writer.WriteBit(+npc.drogan.intro);
      writer.WriteBit(0);
      writer.WriteBit(+npc.alkor.intro);
      writer.WriteBit(+npc.hratli.intro);
      writer.WriteBit(+npc.ashera.intro);
      writer.WriteBits(new Uint8Array(2).fill(0), 2);
      writer.WriteBit(+npc.cain_act_iii.intro);
      writer.WriteBit(0);
      writer.WriteBit(+npc.elzix.intro);
      writer.WriteBit(+npc.malah.intro);
      writer.WriteBit(+npc.anya.intro);
      writer.WriteBit(0);
      writer.WriteBit(+npc.natalya.intro);
      writer.WriteBit(+npc.meshif_act_iii.intro);
      writer.WriteBits(new Uint8Array(2).fill(0), 2);
      writer.WriteBit(+npc.ormus.intro);
      writer.WriteBits(new Uint8Array(5).fill(0), 5);
      writer.WriteBit(+npc.cain_act_v.intro);
      writer.WriteBit(+npc.qualkehk.intro);
      writer.WriteBit(+npc.nihlathak.intro);
    }
    for (let j = 0; j < 3; j++) {
      writer.SeekByte(24 + j * 5);
      const npc = npcs[difficulties[j] as keyof typeof npcs];
      writer.WriteBit(+npc.warriv_act_ii.congrats);
      writer.WriteBit(0);
      writer.WriteBit(+npc.charsi.congrats);
      writer.WriteBit(+npc.warriv_act_i.congrats);
      writer.WriteBit(+npc.kashya.congrats);
      writer.WriteBit(+npc.akara.congrats);
      writer.WriteBit(+npc.gheed.congrats);
      writer.WriteBit(0);
      writer.WriteBit(+npc.greiz.congrats);
      writer.WriteBit(+npc.jerhyn.congrats);
      writer.WriteBit(+npc.meshif_act_ii.congrats);
      writer.WriteBit(+npc.geglash.congrats);
      writer.WriteBit(+npc.lysnader.congrats);
      writer.WriteBit(+npc.fara.congrats);
      writer.WriteBit(+npc.drogan.congrats);
      writer.WriteBit(0);
      writer.WriteBit(+npc.alkor.congrats);
      writer.WriteBit(+npc.hratli.congrats);
      writer.WriteBit(+npc.ashera.congrats);
      writer.WriteBits(new Uint8Array(2).fill(0), 2);
      writer.WriteBit(+npc.cain_act_iii.congrats);
      writer.WriteBit(0);
      writer.WriteBit(+npc.elzix.congrats);
      writer.WriteBit(+npc.malah.congrats);
      writer.WriteBit(+npc.anya.congrats);
      writer.WriteBit(0);
      writer.WriteBit(+npc.natalya.congrats);
      writer.WriteBit(+npc.meshif_act_iii.congrats);
      writer.WriteBits(new Uint8Array(2).fill(0), 2);
      writer.WriteBit(+npc.ormus.congrats);
      writer.WriteBits(new Uint8Array(5).fill(0), 5);
      writer.WriteBit(+npc.cain_act_v.congrats);
      writer.WriteBit(+npc.qualkehk.congrats);
      writer.WriteBit(+npc.nihlathak.congrats);
    }
  }
  return writer.ToArray();
}
