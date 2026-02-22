export interface IConfig {}

export interface IConstantData {
  classes: any[];
  skills: any[];
  magic_prefixes: any[];
  magic_suffixes: any[];
  rare_names: any[];
  armor_items: any;
  weapon_items: any;
  other_items: any;
  stackables: any;
  properties: any;
  magical_properties: any[];
  runewords: any[];
  set_items: any[];
  unq_items: any[];
}

export interface ICorpse {
  items: IItem[];
  unknown_4: number;    // 4 bytes, purpose unknown
  x_position: number;  // 4 bytes, corpse x position on map
  y_position: number;  // 4 bytes, corpse y position on map
}

export interface ID2S {
  header: IHeader;
  attributes: IAttributes;
  item_bonuses: IMagicProperty[];
  skills: ISkill[]; //Skill
  items: IItem[]; //Item
  corpses: ICorpse[];
  merc_items: IItem[];
  golem_item: IItem;
}

export interface IAttributes {
  [key: string]: number;
}

export interface IMenuAppearance {
  graphic: number;
  tint: number;
}
export interface ICharMenuAppearance {
  //composite.txt
  head: IMenuAppearance;
  torso: IMenuAppearance;
  legs: IMenuAppearance;
  right_arm: IMenuAppearance;
  left_arm: IMenuAppearance;
  right_hand: IMenuAppearance;
  left_hand: IMenuAppearance;
  shield: IMenuAppearance;
  special1: IMenuAppearance; //right shoulder
  special2: IMenuAppearance; //left shoulder
  special3: IMenuAppearance;
  special4: IMenuAppearance;
  special5: IMenuAppearance;
  special6: IMenuAppearance;
  special7: IMenuAppearance;
  special8: IMenuAppearance;
}

export interface IDifficulty {
  Normal: number;
  Nightmare: number;
  Hell: number;
}

export interface INPC {
  intro: boolean;
  congrats: boolean;
}

export interface INPCS {
  warriv_act_ii: INPC;  // bit 0
  unknown_1: INPC;      // bit 1
  charsi: INPC;         // bit 2
  warriv_act_i: INPC;   // bit 3
  kashya: INPC;         // bit 4
  akara: INPC;          // bit 5
  gheed: INPC;          // bit 6
  unknown_2: INPC;      // bit 7
  greiz: INPC;          // bit 8
  jerhyn: INPC;         // bit 9
  meshif_act_ii: INPC;  // bit 10
  geglash: INPC;        // bit 11
  lysnader: INPC;       // bit 12
  fara: INPC;           // bit 13
  drogan: INPC;         // bit 14
  unknown_3: INPC;      // bit 15
  alkor: INPC;          // bit 16
  hratli: INPC;         // bit 17
  ashera: INPC;         // bit 18
  unknown_4: INPC;      // bit 19
  unknown_5: INPC;      // bit 20
  cain_act_iii: INPC;   // bit 21
  unknown_6: INPC;      // bit 22
  elzix: INPC;          // bit 23
  malah: INPC;          // bit 24
  anya: INPC;           // bit 25
  unknown_7: INPC;      // bit 26
  natalya: INPC;        // bit 27
  meshif_act_iii: INPC; // bit 28
  unknown_8: INPC;      // bit 29
  unknown_9: INPC;      // bit 30
  ormus: INPC;          // bit 31
  unknown_10: INPC;     // bit 32
  unknown_11: INPC;     // bit 33
  unknown_12: INPC;     // bit 34
  unknown_13: INPC;     // bit 35
  unknown_14: INPC;     // bit 36
  cain_act_v: INPC;     // bit 37
  qualkehk: INPC;       // bit 38
  nihlathak: INPC;      // bit 39
}

export interface IQuest {
  unk15: boolean;
  unk14: boolean;
  done_recently: boolean; //13
  closed: boolean; //12
  unk11: boolean;
  unk10: boolean;
  unk9: boolean;
  unk8: boolean;
  consumed_scroll: boolean; //7
  unk6: boolean;
  unk5: boolean;
  unk4: boolean;
  unk3: boolean;
  is_received: boolean; //2
  is_completed: boolean; //1
  is_requirement_completed: boolean; //0
}

export interface IActIQuests {
  introduced: number;
  den_of_evil: IQuest;
  sisters_burial_grounds: IQuest;
  tools_of_the_trade: IQuest;
  the_search_for_cain: IQuest;
  the_forgotten_tower: IQuest;
  sisters_to_the_slaughter: IQuest;
  completed: number;
}

export interface IActIWaypoints {
  rogue_encampement: boolean;
  cold_plains: boolean;
  stony_field: boolean;
  dark_woods: boolean;
  black_marsh: boolean;
  outer_cloister: boolean;
  jail_lvl_1: boolean;
  inner_cloister: boolean;
  catacombs_lvl_2: boolean;
}

export interface IActIIQuests {
  introduced: number;
  radaments_lair: IQuest;
  the_horadric_staff: IQuest;
  tainted_sun: IQuest;
  arcane_sanctuary: IQuest;
  the_summoner: IQuest;
  the_seven_tombs: IQuest;
  completed: number;
}

export interface IActIIWaypoints {
  lut_gholein: boolean;
  sewers_lvl_2: boolean;
  dry_hills: boolean;
  halls_of_the_dead_lvl_2: boolean;
  far_oasis: boolean;
  lost_city: boolean;
  palace_cellar_lvl_1: boolean;
  arcane_sanctuary: boolean;
  canyon_of_the_magi: boolean;
}

export interface IActIIIQuests {
  introduced: number;
  lam_esens_tome: IQuest;
  khalims_will: IQuest;
  blade_of_the_old_religion: IQuest;
  the_golden_bird: IQuest;
  the_blackened_temple: IQuest;
  the_guardian: IQuest;
  completed: number;
}

export interface IActIIIWaypoints {
  kurast_docks: boolean;
  spider_forest: boolean;
  great_marsh: boolean;
  flayer_jungle: boolean;
  lower_kurast: boolean;
  kurast_bazaar: boolean;
  upper_kurast: boolean;
  travincal: boolean;
  durance_of_hate_lvl_2: boolean;
}

export interface IActIVQuests {
  introduced: number;
  the_fallen_angel: IQuest;
  terrors_end: IQuest;
  hellforge: IQuest;
  completed: number;
}

export interface IActIVWaypoints {
  the_pandemonium_fortress: boolean;
  city_of_the_damned: boolean;
  river_of_flame: boolean;
}

export interface IActVQuests {
  introduced: number;
  siege_on_harrogath: IQuest;
  rescue_on_mount_arreat: IQuest;
  prison_of_ice: IQuest;
  betrayal_of_harrogath: IQuest;
  rite_of_passage: IQuest;
  eve_of_destruction: IQuest;
  completed: number; // raw UInt16 — contains bitmask state beyond a simple boolean
}

export interface IActVWaypoints {
  harrogath: boolean;
  frigid_highlands: boolean;
  arreat_plateau: boolean;
  crystalline_passage: boolean;
  halls_of_pain: boolean;
  glacial_trail: boolean;
  frozen_tundra: boolean;
  the_ancients_way: boolean;
  worldstone_keep_lvl_2: boolean;
}

export interface IQuests {
  act_i: IActIQuests;
  act_ii: IActIIQuests;
  act_iii: IActIIIQuests;
  act_iv: IActIVQuests;
  act_v: IActVQuests;
  // 10 unknown bytes between act_iv and act_v (saved verbatim for faithful round-tripping)
  unknown_act_iv_v_gap?: Uint8Array;
  // 12 unknown bytes at the end of each difficulty quest block
  unknown_trailing?: Uint8Array;
}

export interface IWaypoints {
  act_i: IActIWaypoints;
  act_ii: IActIIWaypoints;
  act_iii: IActIIIWaypoints;
  act_iv: IActIVWaypoints;
  act_v: IActVWaypoints;
  unknown_header?: Uint8Array; // 2 bytes before waypoint bits (preserved for round-tripping)
  unknown_trailing?: Uint8Array; // 17 bytes after waypoint bits (preserved for round-tripping)
}

export interface INPCData {
  normal: INPCS;
  nm: INPCS;
  hell: INPCS;
  unknown_gap?: Uint8Array;      // 9 bytes between intro and congrats sections
  unknown_trailing?: Uint8Array; // 9 bytes after congrats section
}

export interface IWaypointData {
  normal: IWaypoints;
  nm: IWaypoints;
  hell: IWaypoints;
}

export interface IHeader {
  hex?: string;
  identifier: string;
  checksum: string;
  name: string;
  status: IStatus;
  class: string;
  created: number;
  last_played: number;
  menu_appearance: ICharMenuAppearance;
  left_skill: string;
  right_skill: string;
  left_swap_skill: string;
  right_swap_skill: string;
  merc_id: string;
  assigned_skills: string[];
  quests_normal: IQuests;
  quests_nm: IQuests;
  quests_hell: IQuests;
  waypoints: IWaypointData;
  npcs: INPCData;
  version: number;
  filesize: number;
  active_arms: number;
  progression: number;
  level: number;
  difficulty: IDifficulty;
  map_id: number;
  dead_merc: number;
  merc_name_id: number;
  merc_type: number;
  merc_experience: number;
  // 1 = Classic, 2 = LoD, 3 = RotW
  realm: number;
  quests_header_magic?: string;
  quests_header_version?: number;
  quests_header_length?: number;
  waypoints_header_magic?: string;
  waypoints_header_version?: number;
  waypoints_header_length?: number;
  npcs_header_magic?: Uint8Array;
  npcs_header_length?: number;
  extended_header_data?: Uint8Array;
  unknown_before_realm?: Uint8Array;
  unknown_after_realm?: Uint8Array;
  unknown_after_name?: Uint8Array;
  // raw 32-bit skill IDs for the 16 hotkey slots (preserved verbatim for round-tripping)
  assigned_skill_ids?: number[];
  // stat IDs in the order they appear in the save file (preserved for round-tripping)
  attributes_order?: number[];
}

export interface IStatus {
  expansion: boolean;
  died: boolean;
  hardcore: boolean;
  ladder: boolean;
}

export interface ISkill {
  id: number;
  points: number;
  name: string;
}

export interface IItem {
  // the bit-offset within the save file at which the item was read, if any
  offset?: number;
  hex?: string;
  identified: number;
  socketed: number;
  new: number;
  is_ear: number;
  starter_item: number;
  simple_item: number;
  ethereal: number;
  personalized: number;
  personalized_name: string;
  given_runeword: number;
  version: string;
  location_id: number;
  equipped_id: number;
  position_x: number;
  position_y: number;
  alt_position_id: number;
  type: string;
  type_id: number;
  type_name: string;
  quest_difficulty: number;
  nr_of_items_in_sockets: number;
  id: number;
  level: number;
  quality: number;
  multiple_pictures: number;
  picture_id: number;
  class_specific: number;
  low_quality_id: number;
  normal_12_bits: null | Uint8Array;
  timestamp: number;
  ear_attributes: IEarAttributes;
  defense_rating: number;
  max_durability: number;
  current_durability: number;
  total_nr_of_sockets: number;
  quantity: number;
  magic_prefix: number;
  magic_prefix_name: string;
  magic_suffix: number;
  magic_suffix_name: string;
  runeword_id: number;
  runeword_name: string;
  runeword_attributes: IMagicProperty[];
  set_id: number;
  set_name: string;
  set_list_count: number;
  set_attributes: IMagicProperty[][];
  set_attributes_num_req: number;
  set_attributes_ids_req: number;
  rare_name: string;
  rare_name2: string;
  magical_name_ids: number[] | null[];
  unique_id: number;
  unique_name: string;
  magic_attributes: IMagicProperty[];
  combined_magic_attributes: IMagicProperty[];
  socketed_items: IItem[];
  base_damage: IWeaponDamage;
  reqstr: number;
  reqdex: number;
  inv_width: number;
  inv_height: number;
  inv_file: number;
  inv_transform: number;
  transform_color: string;
  item_quality: EItemQuality;
  categories: string[];
  file_index: number;
  auto_affix_id: number;
  _unknown_data: {
    b0_3?: Uint8Array;
    b5_10?: Uint8Array;
    b12?: Uint8Array;
    b14_15?: Uint8Array;
    b18_20?: Uint8Array;
    b23?: Uint8Array;
    b25?: Uint8Array;
    b27_31?: Uint8Array;
    plist_flag?: number;
    v105_extra_bit_1?: Uint8Array;
    v105_extra_bit_2?: Uint8Array;
    runeword_extra_4?: number; // 4 bits after runeword_id (preserved verbatim)
    tome_extra_5?: number; // 5 bits for tome items (tbk/ibk, preserved verbatim)
  };
  rare_name_id: number;
  rare_name_id2: number;
  displayed_magic_attributes: IMagicProperty[];
  displayed_runeword_attributes: IMagicProperty[];
  displayed_combined_magic_attributes: IMagicProperty[];
  advanced_stash_quantity?: number;
}

export interface IWeaponDamage {
  mindam: number;
  maxdam: number;
  twohandmindam: number;
  twohandmaxdam: number;
}

export interface IEarAttributes {
  class: number;
  level: number;
  name: string;
}

export interface IMagicProperty {
  id: number;
  name: string;
  values: number[];
  description: string;
  visible: boolean;
  op_value: number;
  op_stats: string[];
}

export interface IStash {
  version: string;
  type: EStashType;
  pageCount: number;
  sharedGold: number;
  kind: number;
  pages: IStashPage[];
  advancedTabData?: Uint8Array; // raw bytes for the RotW advanced tab metadata section
}

export interface IStashPage {
  name: string;
  type: number;
  items: IItem[];
  sectionType?: number; // D2R section padding[0]: 0=normal, 1=advanced stash items, 2=advanced tab metadata
}

export type EStashType = 'shared' | 'private';

export type EItemQuality = 'normal' | 'exceptional' | 'elite';
