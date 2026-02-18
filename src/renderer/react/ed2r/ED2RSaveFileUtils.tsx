import type {
  ID2S,
  IItem,
  IMagicProperty,
  IStashPage,
  IWeaponDamage,
} from 'bridge/third-party/d2s/d2/types';
import type { GameFiles } from 'renderer/react/ed2r/ED2RGameFilesContext';

// ---------------------------------------------------------------------------
// Types for the lookup indexes we build from raw game files
// ---------------------------------------------------------------------------

type Strings = { [key: string]: string };

type ItemDetails = {
  code: string;
  typeName: string;
  maxDefense?: number;
  durability?: number;
  minDamage?: number;
  maxDamage?: number;
  twoHandMinDamage?: number;
  twoHandMaxDamage?: number;
  requiredStrength?: number;
  requiredDexterity?: number;
  inventoryFile?: string;
  uniqueInventoryFile?: string;
  setInventoryFile?: string;
  inventoryWidth?: number;
  inventoryHeight?: number;
  inventoryTransform?: number;
  gemApplyType?: number;
  itemQuality: 'normal' | 'exceptional' | 'elite';
  categories?: string[];
  inventoryGraphics?: string[];
  gemMods?: {
    [id: number]: { m: string; p?: number; min?: number; max?: number }[];
  };
};

type MagicAffix = {
  name: string;
  transformColor?: string;
};

type SetOrUniqueItem = {
  name: string;
  inventoryFile?: string;
  code?: string;
  transformColor?: string;
};

type MagicalProperty = {
  stat: string;
  saveBits?: number;
  saveAdd?: number;
  saveParamBits?: number;
  charSaveBits?: number;
  charSaveParam?: number;
  charSaveSigned?: number;
  encode?: number;
  valShift?: number;
  signed?: number;
  sortOrder?: number;
  descFunc?: number;
  descVal?: number;
  descPositive?: string;
  descNegative?: string;
  descExtra?: string;
  descGroup?: number;
  descGroupFunc?: number;
  descGroupVal?: number;
  descGroupPositive?: string;
  descGroupNegative?: string;
  descGroupExtra?: string;
  op?: number;
  opParam?: number;
  opBase?: string;
  opStats?: string[];
  numProps?: number;
  descRange?: string;
  descEqual?: string;
};

type PropertyStat = {
  stat?: string;
  func?: number;
};

type SkillInfo = {
  skillName?: string;
  classCode?: string;
};

type ClassInfo = {
  name: string;
  code: string;
  allSkillsString: string;
  skillTabStrings: string[];
  classOnlyString: string;
};

type ItemTypeInfo = {
  name: string;
  categories: string[];
  inventoryGraphics: string[];
  equiv1?: string;
  equiv2?: string;
  equiv1Name?: string;
  equiv2Name?: string;
};

type EnhancerData = {
  strings: Strings;
  armorByCode: { [code: string]: ItemDetails };
  weaponByCode: { [code: string]: ItemDetails };
  miscByCode: { [code: string]: ItemDetails };
  magicPrefixes: MagicAffix[];
  magicSuffixes: MagicAffix[];
  uniqueItems: SetOrUniqueItem[];
  setItems: SetOrUniqueItem[];
  magicalProperties: MagicalProperty[];
  properties: { [code: string]: PropertyStat[] };
  skills: SkillInfo[];
  classes: ClassInfo[];
};

// ---------------------------------------------------------------------------
// Cache for computed indexes — invalidated when gameFiles reference changes
// ---------------------------------------------------------------------------

let cachedGameFiles: GameFiles | null = null;
let cachedData: EnhancerData | null = null;

function getEnhancerData(gameFiles: GameFiles): EnhancerData {
  if (cachedGameFiles === gameFiles && cachedData != null) {
    return cachedData;
  }

  const strings = buildStrings(gameFiles);
  const itemTypes = buildItemTypes(gameFiles);
  const armorByCode = buildItemsByCode(
    gameFiles['global/excel/armor.txt'] as TSVData,
    itemTypes,
    strings,
  );
  const weaponByCode = buildItemsByCode(
    gameFiles['global/excel/weapons.txt'] as TSVData,
    itemTypes,
    strings,
  );
  const miscByCode = buildItemsByCode(
    gameFiles['global/excel/misc.txt'] as TSVData,
    itemTypes,
    strings,
  );

  // apply gem mods to misc items
  applyGemMods(miscByCode, gameFiles['global/excel/gems.txt'] as TSVData);

  const magicPrefixes = buildMagicAffixes(
    gameFiles['global/excel/magicprefix.txt'] as TSVData,
    strings,
  );
  const magicSuffixes = buildMagicAffixes(
    gameFiles['global/excel/magicsuffix.txt'] as TSVData,
    strings,
  );
  const uniqueItems = buildSetOrUniqueItems(
    gameFiles['global/excel/uniqueitems.txt'] as TSVData,
    strings,
  );
  const setItems = buildSetOrUniqueItems(
    gameFiles['global/excel/setitems.txt'] as TSVData,
    strings,
  );
  const magicalProperties = buildMagicalProperties(
    gameFiles['global/excel/itemstatcost.txt'] as TSVData,
    strings,
  );
  const properties = buildProperties(
    gameFiles['global/excel/properties.txt'] as TSVData,
  );
  const skillDescs = buildSkillDescs(
    gameFiles['global/excel/skilldesc.txt'] as TSVData,
    strings,
  );
  const skills = buildSkills(
    gameFiles['global/excel/skills.txt'] as TSVData,
    skillDescs,
  );
  const classes = buildClasses(
    gameFiles['global/excel/charstats.txt'] as TSVData,
    gameFiles['global/excel/playerclass.txt'] as TSVData,
    strings,
  );

  cachedData = {
    strings,
    armorByCode,
    weaponByCode,
    miscByCode,
    magicPrefixes,
    magicSuffixes,
    uniqueItems,
    setItems,
    magicalProperties,
    properties,
    skills,
    classes,
  };
  cachedGameFiles = gameFiles;
  return cachedData;
}

// ---------------------------------------------------------------------------
// Index builders — parse raw game files into lookup structures
// ---------------------------------------------------------------------------

function buildStrings(gameFiles: GameFiles): Strings {
  const result: Strings = {};
  for (const filePath of [
    'local/lng/strings/item-gems.json',
    'local/lng/strings/item-modifiers.json',
    'local/lng/strings/item-nameaffixes.json',
    'local/lng/strings/item-names.json',
    'local/lng/strings/item-runes.json',
    'local/lng/strings/skills.json',
  ]) {
    const data = gameFiles[filePath] as { Key: string; enUS: string }[];
    if (data == null) continue;
    for (const entry of data) {
      result[entry.Key] = entry.enUS;
    }
  }
  return result;
}

function buildItemTypes(gameFiles: GameFiles): {
  [code: string]: ItemTypeInfo;
} {
  const tsv = gameFiles['global/excel/itemtypes.txt'] as TSVData;
  const arr: { [code: string]: ItemTypeInfo } = {};

  for (const row of tsv.rows) {
    const code = row.Code;
    if (!code) continue;
    const invgfx: string[] = [];
    for (let j = 1; j <= 6; j++) {
      const val = row[`InvGfx${j}`];
      if (val) invgfx[j - 1] = val;
    }
    arr[code] = {
      name: row.ItemType,
      categories: [row.ItemType],
      inventoryGraphics: invgfx,
      equiv1: row.Equiv1,
      equiv2: row.Equiv2,
    };
  }

  // resolve categories recursively
  function resolveCategories(key: string): string[] {
    if (arr[key] == null) return [];
    return [
      arr[key].name,
      ...resolveCategories(arr[key].equiv1 ?? ''),
      ...resolveCategories(arr[key].equiv2 ?? ''),
    ];
  }

  for (const k of Object.keys(arr)) {
    arr[k].categories = resolveCategories(k);
    if (arr[k].equiv1 && arr[arr[k].equiv1!]) {
      arr[k].equiv1Name = arr[arr[k].equiv1!].name;
    }
    if (arr[k].equiv2 && arr[arr[k].equiv2!]) {
      arr[k].equiv2Name = arr[arr[k].equiv2!].name;
    }
  }

  return arr;
}

function buildItemsByCode(
  tsv: TSVData,
  itemTypes: { [code: string]: ItemTypeInfo },
  strings: Strings,
): { [code: string]: ItemDetails } {
  const result: { [code: string]: ItemDetails } = {};

  for (const row of tsv.rows) {
    const code = row.code;
    if (!code) continue;

    const item: ItemDetails = {
      code,
      typeName: strings[row.namestr] ?? row.namestr ?? '',
      itemQuality:
        code === row.ubercode
          ? 'exceptional'
          : code === row.ultracode
            ? 'elite'
            : 'normal',
    };

    if (row.maxac && +row.maxac > 0) item.maxDefense = +row.maxac;
    if (row.durability) item.durability = +row.durability;
    if (row.mindam && +row.mindam > 0) item.minDamage = +row.mindam;
    if (row.maxdam && +row.maxdam > 0) item.maxDamage = +row.maxdam;
    if (row['2handmindam'] && +row['2handmindam'] > 0)
      item.twoHandMinDamage = +row['2handmindam'];
    if (row['2handmaxdam'] && +row['2handmaxdam'] > 0)
      item.twoHandMaxDamage = +row['2handmaxdam'];
    if (row.reqstr) item.requiredStrength = +row.reqstr;
    if (row.reqdex) item.requiredDexterity = +row.reqdex;
    if (row.invfile) item.inventoryFile = row.invfile;
    if (row.uniqueinvfile) item.uniqueInventoryFile = row.uniqueinvfile;
    if (row.setinvfile) item.setInventoryFile = row.setinvfile;
    if (row.invwidth) item.inventoryWidth = +row.invwidth;
    if (row.invheight) item.inventoryHeight = +row.invheight;
    if (row.InvTrans) item.inventoryTransform = +row.InvTrans;
    if (row.gemapplytype) item.gemApplyType = +row.gemapplytype;

    const type = itemTypes[row.type];
    if (type) {
      item.inventoryGraphics = type.inventoryGraphics;
      item.categories = type.categories;
    }

    result[code] = item;
  }

  return result;
}

function applyGemMods(
  miscByCode: { [code: string]: ItemDetails },
  gemsTsv: TSVData,
): void {
  const types = ['weapon', 'helm', 'shield'];

  for (const row of gemsTsv.rows) {
    const code = row.code;
    if (!code || code === 'Expansion') continue;

    const item = miscByCode[code];
    if (!item) continue;

    for (let k = 0; k < 3; k++) {
      const type = types[k];
      for (let j = 1; j <= 3; j++) {
        const mod = row[`${type}Mod${j}Code`];
        if (!mod) break;

        if (j === 1) {
          if (!item.gemMods) item.gemMods = [];
          item.gemMods[k] = [];
        }

        const m: { m: string; p?: number; min?: number; max?: number } = {
          m: mod,
        };
        if (row[`${type}Mod${j}Param`]) m.p = +row[`${type}Mod${j}Param`];
        if (row[`${type}Mod${j}Min`]) m.min = +row[`${type}Mod${j}Min`];
        if (row[`${type}Mod${j}Max`]) m.max = +row[`${type}Mod${j}Max`];
        item.gemMods![k].push(m);
      }
    }
  }
}

function buildMagicAffixes(tsv: TSVData, strings: Strings): MagicAffix[] {
  const arr: MagicAffix[] = [];
  let id = 1;
  for (const row of tsv.rows) {
    const rowName = row.Name;
    if (rowName !== 'Expansion') {
      const affix: MagicAffix = { name: strings[rowName] };
      if (row.transformcolor) affix.transformColor = row.transformcolor;
      arr[id] = affix;
      id++;
    }
  }
  return arr;
}

function buildSetOrUniqueItems(
  tsv: TSVData,
  strings: Strings,
): SetOrUniqueItem[] {
  const arr: SetOrUniqueItem[] = [];
  let id = 0;
  for (const row of tsv.rows) {
    const index = row.index;
    if (index && index !== 'Expansion') {
      const entry: SetOrUniqueItem = { name: strings[index] };
      if (row.invfile) entry.inventoryFile = row.invfile;
      const code = row.code ?? row.item;
      if (code) entry.code = code;
      if (row.invtransform) entry.transformColor = row.invtransform;
      arr[id] = entry;
      id++;
    }
  }
  return arr;
}

// special stats — hardcoded in d2, not in itemstatcost
const ITEM_PROPERTY_STAT_COUNT: {
  [stat: string]: { numprops: number; rangestr: string; equalstr: string };
} = {
  item_maxdamage_percent: {
    numprops: 2,
    rangestr: 'strModMinDamageRange',
    equalstr: 'strModEnhancedDamage',
  },
  firemindam: {
    numprops: 2,
    rangestr: 'strModFireDamageRange',
    equalstr: 'strModFireDamage',
  },
  lightmindam: {
    numprops: 2,
    rangestr: 'strModLightningDamageRange',
    equalstr: 'strModLightningDamage',
  },
  magicmindam: {
    numprops: 2,
    rangestr: 'strModMagicDamageRange',
    equalstr: 'strModMagicDamage',
  },
  coldmindam: {
    numprops: 3,
    rangestr: 'strModColdDamageRange',
    equalstr: 'strModColdDamage',
  },
  poisonmindam: {
    numprops: 3,
    rangestr: 'strModPoisonDamageRange',
    equalstr: 'strModPoisonDamage',
  },
};

function buildMagicalProperties(
  tsv: TSVData,
  strings: Strings,
): MagicalProperty[] {
  const arr: MagicalProperty[] = [];
  for (const row of tsv.rows) {
    const statName = row.Stat;
    const id = +(row.ID ?? row['*ID'] ?? '');
    if (!statName) continue;

    const prop: MagicalProperty = { stat: statName };
    if (row.CSvBits) prop.charSaveBits = +row.CSvBits;
    if (row.CSvParam) prop.charSaveParam = +row.CSvParam;
    if (row.CSvSigned) prop.charSaveSigned = +row.CSvSigned;
    if (row.Encode) prop.encode = +row.Encode;
    if (row.ValShift) prop.valShift = +row.ValShift;
    if (row.Signed) prop.signed = +row.Signed;
    if (row['Save Bits']) prop.saveBits = +row['Save Bits'];
    if (row['Save Add']) prop.saveAdd = +row['Save Add'];
    if (row['Save Param Bits']) prop.saveParamBits = +row['Save Param Bits'];
    if (row.descpriority) prop.sortOrder = +row.descpriority;
    if (row.descfunc) prop.descFunc = +row.descfunc;
    if (row.descval) prop.descVal = +row.descval;
    if (row.descstrpos) prop.descPositive = strings[row.descstrpos];
    if (row.descstrneg) prop.descNegative = strings[row.descstrneg];
    if (row.descstr2) prop.descExtra = strings[row.descstr2];
    if (row.dgrp) prop.descGroup = +row.dgrp;
    if (row.dgrpfunc) prop.descGroupFunc = +row.dgrpfunc;
    if (row.dgrpval) prop.descGroupVal = +row.dgrpval;
    if (row.dgrpstrpos) prop.descGroupPositive = strings[row.dgrpstrpos];
    if (row.dgrpstrneg) prop.descGroupNegative = strings[row.dgrpstrneg];
    if (row.dgrpstr2) prop.descGroupExtra = strings[row.dgrpstr2];
    if (row.op) prop.op = +row.op;
    if (row['op param']) prop.opParam = +row['op param'];
    if (row['op base']) prop.opBase = row['op base'];
    if (row['op stat1']) prop.opStats = [row['op stat1']];
    if (row['op stat2']) prop.opStats![1] = row['op stat2'];
    if (row['op stat3']) prop.opStats![2] = row['op stat3'];

    const dmgstatrange = ITEM_PROPERTY_STAT_COUNT[statName];
    if (dmgstatrange) {
      prop.numProps = dmgstatrange.numprops;
      prop.descRange = strings[dmgstatrange.rangestr];
      prop.descEqual = strings[dmgstatrange.equalstr];
    }

    arr[id] = prop;
  }
  return arr;
}

function buildProperties(tsv: TSVData): { [code: string]: PropertyStat[] } {
  const arr: { [code: string]: PropertyStat[] } = {};
  for (const row of tsv.rows) {
    const code = row.code;
    if (!code || code === 'Expansion') continue;

    const prop: PropertyStat[] = [];
    for (let j = 1; j <= 7; j++) {
      const statName = row[`stat${j}`];
      const funcValue = row[`func${j}`];
      if (!statName && !funcValue) break;
      const entry: PropertyStat = {};
      if (statName) entry.stat = statName;
      if (funcValue) entry.func = +funcValue;
      prop[j - 1] = entry;
    }
    if (prop.length) {
      arr[code] = prop;
    }
  }
  return arr;
}

function buildSkillDescs(
  tsv: TSVData,
  strings: Strings,
): { [id: string]: string } {
  const arr: { [id: string]: string } = {};
  for (const row of tsv.rows) {
    const id = row.skilldesc;
    const strName = row['str name'];
    if (id && strName && strings[strName]) {
      arr[id] = strings[strName];
    }
  }
  return arr;
}

function buildSkills(
  tsv: TSVData,
  skillDescs: { [id: string]: string },
): SkillInfo[] {
  const arr: SkillInfo[] = [];
  for (const row of tsv.rows) {
    const id = +(row.Id ?? row['*Id'] ?? '');
    const skillDesc = row.skilldesc;
    if (skillDesc) {
      const entry: SkillInfo = {};
      if (skillDescs[skillDesc]) entry.skillName = skillDescs[skillDesc];
      if (row.charclass) entry.classCode = row.charclass;
      arr[id] = entry;
    }
  }
  return arr;
}

function buildClasses(
  charstatsTsv: TSVData,
  playerclassTsv: TSVData,
  strings: Strings,
): ClassInfo[] {
  const arr: ClassInfo[] = [];
  let id = 0;
  for (let i = 0; i < charstatsTsv.rows.length; i++) {
    const row = charstatsTsv.rows[i];
    const clazz = row.class;
    if (clazz && clazz !== 'Expansion') {
      const playerRow = playerclassTsv.rows[i];
      arr[id] = {
        name: clazz,
        code: playerRow?.Code ?? '',
        allSkillsString: strings[row.StrAllSkills] ?? '',
        skillTabStrings: [
          strings[row.StrSkillTab1] ?? '',
          strings[row.StrSkillTab2] ?? '',
          strings[row.StrSkillTab3] ?? '',
        ],
        classOnlyString: strings[row.StrClassOnly] ?? '',
      };
      id++;
    }
  }
  return arr;
}

// ---------------------------------------------------------------------------
// Public API — enhancement functions
// ---------------------------------------------------------------------------

enum ItemType {
  Armor = 0x01,
  Shield = 0x02,
  Weapon = 0x03,
  Other = 0x04,
}

export function enhanceCharacter(char: ID2S, gameFiles: GameFiles): void {
  const level = char.attributes?.level ?? 1;
  enhanceItems(char.items, gameFiles, level);
  enhanceItems([char.golem_item], gameFiles, level);
  enhanceItems(char.merc_items, gameFiles, level);
  enhanceItems(char.corpse_items, gameFiles, level);
  enhancePlayerAttributes(char, gameFiles);
}

export function enhanceStashPage(page: IStashPage, gameFiles: GameFiles): void {
  enhanceItems(page.items, gameFiles, 1);
}

export function enhancePlayerAttributes(
  char: ID2S,
  gameFiles: GameFiles,
): void {
  const data = getEnhancerData(gameFiles);
  const items = char.items.filter((item) => {
    return (
      item.location_id === 1 &&
      item.equipped_id !== 13 &&
      item.equipped_id !== 14
    );
  });

  char.item_bonuses = ([] as IMagicProperty[]).concat
    .apply(
      [],
      items.map((item) => allAttributes(item)),
    )
    .filter((attribute) => attribute != null);
  char.item_bonuses = groupAttributes(char.item_bonuses, data);
  enhanceAttributeDescription(char.item_bonuses, data, char.attributes.level);
}

export function enhanceItems(
  items: IItem[],
  gameFiles: GameFiles,
  level = 1,
  parent?: IItem,
): void {
  if (!items) return;
  for (const item of items) {
    if (!item) continue;
    if (item.socketed_items && item.socketed_items.length) {
      enhanceItems(item.socketed_items, gameFiles, level, item);
    }
    enhanceItem(item, gameFiles, level, parent);
  }
}

export function enhanceItem(
  item: IItem,
  gameFiles: GameFiles,
  level = 1,
  parent?: IItem,
): void {
  const data = getEnhancerData(gameFiles);

  if (parent) {
    // socket item
    const parentDetails =
      data.armorByCode[parent.type] ||
      data.weaponByCode[parent.type] ||
      data.miscByCode[item.type];
    const socketedItemDetails = data.miscByCode[item.type];
    if (socketedItemDetails?.gemMods) {
      item.magic_attributes = compactAttributes(
        socketedItemDetails.gemMods[parentDetails.gemApplyType!],
        data,
      );
    }
  }

  let details: ItemDetails | null = null;
  if (data.armorByCode[item.type]) {
    details = data.armorByCode[item.type];
    item.type_id = ItemType.Armor;
    if (details.maxDefense) {
      if (item.ethereal == 0) {
        item.defense_rating = details.maxDefense;
      } else if (item.ethereal == 1) {
        item.defense_rating = Math.floor(details.maxDefense * 1.5);
      }
    }
  } else if (data.weaponByCode[item.type]) {
    details = data.weaponByCode[item.type];
    item.type_id = ItemType.Weapon;
    const base_damage = {} as IWeaponDamage;
    if (item.ethereal == 0) {
      if (details.minDamage) base_damage.mindam = details.minDamage;
      if (details.maxDamage) base_damage.maxdam = details.maxDamage;
      if (details.twoHandMinDamage)
        base_damage.twohandmindam = details.twoHandMinDamage;
      if (details.twoHandMaxDamage)
        base_damage.twohandmaxdam = details.twoHandMaxDamage;
    } else if (item.ethereal == 1) {
      if (details.minDamage)
        base_damage.mindam = Math.floor(details.minDamage * 1.5);
      if (details.maxDamage)
        base_damage.maxdam = Math.floor(details.maxDamage * 1.5);
      if (details.twoHandMinDamage)
        base_damage.twohandmindam = Math.floor(details.twoHandMinDamage * 1.5);
      if (details.twoHandMaxDamage)
        base_damage.twohandmaxdam = Math.floor(details.twoHandMaxDamage * 1.5);
    }
    item.base_damage = base_damage;
  } else if (data.miscByCode[item.type]) {
    item.type_id = ItemType.Other;
    details = data.miscByCode[item.type];
  }

  if (details) {
    if (details.typeName) item.type_name = details.typeName;
    if (details.requiredStrength) item.reqstr = details.requiredStrength;
    if (details.requiredDexterity) item.reqdex = details.requiredDexterity;
    if (details.inventoryFile) item.inv_file = details.inventoryFile as any;
    if (details.inventoryHeight) item.inv_height = details.inventoryHeight;
    if (details.inventoryWidth) item.inv_width = details.inventoryWidth;
    if (details.inventoryTransform)
      item.inv_transform = details.inventoryTransform;
    if (details.itemQuality) item.item_quality = details.itemQuality as any;
    if (details.categories) item.categories = details.categories;
    if (details.durability) {
      if (item.ethereal == 0) {
        item.current_durability = details.durability;
        item.max_durability = details.durability;
      } else if (item.ethereal == 1) {
        item.current_durability =
          details.durability - Math.ceil(details.durability / 2) + 1;
        item.max_durability =
          details.durability - Math.ceil(details.durability / 2) + 1;
      }
    }
    if (item.multiple_pictures && details.inventoryGraphics) {
      item.inv_file = details.inventoryGraphics[item.picture_id] as any;
    }
    if (item.magic_prefix || item.magic_suffix) {
      if (
        item.magic_prefix &&
        data.magicPrefixes[item.magic_prefix]?.transformColor
      ) {
        item.transform_color =
          data.magicPrefixes[item.magic_prefix].transformColor!;
      }
      if (
        item.magic_suffix &&
        data.magicSuffixes[item.magic_suffix]?.transformColor
      ) {
        item.transform_color =
          data.magicSuffixes[item.magic_suffix].transformColor!;
      }
    } else if (item.magical_name_ids && item.magical_name_ids.length === 6) {
      for (let i = 0; i < 6; i++) {
        const id = item.magical_name_ids[i];
        if (id) {
          if (
            i % 2 == 0 &&
            data.magicPrefixes[id] &&
            data.magicPrefixes[id]?.transformColor
          ) {
            item.transform_color = data.magicPrefixes[id].transformColor!;
          } else if (
            data.magicSuffixes[id] &&
            data.magicSuffixes[id]?.transformColor
          ) {
            item.transform_color = data.magicSuffixes[id].transformColor!;
          }
        }
      }
    } else if (item.unique_id) {
      const unq = data.uniqueItems[item.unique_id];
      if (details.uniqueInventoryFile)
        item.inv_file = details.uniqueInventoryFile as any;
      if (unq && unq.inventoryFile) item.inv_file = unq.inventoryFile as any;
      if (unq && unq.transformColor) item.transform_color = unq.transformColor;
    } else if (item.set_id) {
      const set = data.setItems[item.set_id];
      if (details.uniqueInventoryFile)
        item.inv_file = details.uniqueInventoryFile as any;
      if (set && set.inventoryFile) item.inv_file = set.inventoryFile as any;
      if (set && set.transformColor) item.transform_color = set.transformColor;
    }
  }

  if (
    item.magic_attributes ||
    item.runeword_attributes ||
    item.socketed_items
  ) {
    item.displayed_magic_attributes = enhanceAttributeDescription(
      item.magic_attributes,
      data,
      level,
    );
    item.displayed_runeword_attributes = enhanceAttributeDescription(
      item.runeword_attributes,
      data,
      level,
    );
    item.combined_magic_attributes = groupAttributes(allAttributes(item), data);
    item.displayed_combined_magic_attributes = enhanceAttributeDescription(
      item.combined_magic_attributes,
      data,
      level,
    );
  }
}

// ---------------------------------------------------------------------------
// Internal helpers — ported from attribute_enhancer.ts
// ---------------------------------------------------------------------------

function enhanceAttributeDescription(
  _magic_attributes: IMagicProperty[],
  data: EnhancerData,
  level = 1,
): IMagicProperty[] {
  if (!_magic_attributes) return [];

  const magic_attributes: IMagicProperty[] = [
    ..._magic_attributes.map((attr) => ({ ...attr })),
  ];
  const descGroupCounts = [0, 0, 0];
  const descGroupValues = [0, 0, 0];
  for (const property of magic_attributes) {
    const prop = data.magicalProperties[property.id];
    const v = property.values[property.values.length - 1];
    if (prop.descGroup) {
      if (descGroupValues[prop.descGroup - 1] === 0) {
        descGroupValues[prop.descGroup - 1] = v;
      }
      if (descGroupValues[prop.descGroup - 1] - v === 0) {
        descGroupCounts[prop.descGroup - 1]++;
      }
    }
  }
  for (const property of magic_attributes) {
    const prop = data.magicalProperties[property.id];
    if (prop == null) {
      throw new Error(`Cannot find Magical Property for id: ${property.id}`);
    }
    let v = property.values[property.values.length - 1];
    if (prop.opBase === 'level') {
      switch (prop.op) {
        case 1: {
          v = Math.floor((level * v) / 100);
          break;
        }
        case 2:
        case 3:
        case 4:
        case 5: {
          v = Math.floor((level * v) / 2 ** prop.opParam!);
          break;
        }
        default:
          break;
      }
      property.op_stats = prop.opStats as string[];
      property.op_value = v;
    }
    let descFunc = prop.descFunc;
    let descString = v >= 0 ? prop.descPositive : prop.descNegative;
    // hack for d2r...?
    if (
      property.id == 39 ||
      property.id == 41 ||
      property.id == 43 ||
      property.id == 45
    ) {
      descString = prop.descPositive;
    }
    let descVal = prop.descVal;
    let descExtraStr = prop.descExtra;
    if (prop.descGroup && descGroupCounts[prop.descGroup - 1] === 4) {
      v = descGroupValues[prop.descGroup - 1];
      descString =
        v >= 0
          ? prop.descGroupPositive
          : prop.descGroupNegative
            ? prop.descGroupNegative
            : prop.descGroupPositive;
      descVal = prop.descGroupVal;
      descFunc = prop.descGroupFunc;
      descExtraStr = prop.descGroupExtra;
    }
    if (prop.numProps) {
      // damage range or enhanced damage
      let count = 0;
      descString = prop.descRange;

      if (prop.stat === 'poisonmindam') {
        const min = Math.floor((property.values[0] * property.values[2]) / 256);
        const max = Math.floor((property.values[1] * property.values[2]) / 256);
        const seconds = Math.floor(property.values[2] / 25);
        property.values = [min, max, seconds];
      }

      if (property.values[0] === property.values[1]) {
        count++;
        descString = prop.descEqual;
        if (prop.stat === 'item_maxdamage_percent') {
          descString = `+%d% ${descString!.replace(/}/gi, '').replace(/%\+?d%%/gi, '')}`;
        }
      }
      property.description = descString!.replace(/%d/gi, () => {
        const v = property.values[count++];
        return v as any;
      });
    } else {
      descFuncHandler(
        property,
        data,
        v,
        descFunc,
        descVal,
        descString,
        descExtraStr,
      );
    }
  }

  magic_attributes.sort(
    (a, b) =>
      (data.magicalProperties[b.id].sortOrder ?? 0) -
      (data.magicalProperties[a.id].sortOrder ?? 0),
  );

  for (let i = magic_attributes.length - 1; i >= 1; i--) {
    for (let j = i - 1; j >= 0; j--) {
      if (magic_attributes[i].description === magic_attributes[j].description) {
        magic_attributes[j].visible = false;
      }
    }
  }

  return magic_attributes;
}

function compactAttributes(mods: any[], data: EnhancerData): IMagicProperty[] {
  const magic_attributes = [] as IMagicProperty[];
  for (const mod of mods) {
    const propStats = data.properties[mod.m] || [];
    for (let i = 0; i < propStats.length; i++) {
      const propertyStat = propStats[i];
      let statName = propertyStat.stat;
      switch (propertyStat.func) {
        case 5:
          statName = 'mindamage';
          break;
        case 6:
          statName = 'maxdamage';
          break;
        case 7:
          statName = 'item_maxdamage_percent';
          break;
        case 20:
          statName = 'item_indesctructible';
          break;
        default:
          break;
      }
      const id = itemStatCostFromStat(statName!, data);
      const magicProp = data.magicalProperties[id];
      if (magicProp.numProps) i += magicProp.numProps;
      const v = [mod.min, mod.max];
      if (mod.p) {
        v.push(mod.p);
      }
      magic_attributes.push({
        id: id,
        values: v,
        name: magicProp.stat,
      } as IMagicProperty);
    }
  }
  return magic_attributes;
}

function descFuncHandler(
  property: IMagicProperty,
  data: EnhancerData,
  v: number,
  descFunc: number | undefined,
  descVal: number | undefined,
  descString: string | undefined,
  descExtraStr: string | undefined,
): void {
  if (!descFunc) return;

  const sign = v >= 0 ? '+' : '';
  let value: string | number | null = null;
  const hasDescExtra = descFunc >= 6 && descFunc <= 10;
  switch (descFunc) {
    case 1:
    case 6:
    case 12:
      value = `${sign}${v}`;
      break;
    case 2:
    case 7:
      value = `${v}%`;
      break;
    case 3:
    case 9:
      value = `${v}`;
      break;
    case 4:
    case 8:
      value = `${sign}${v}%`;
      break;
    case 5:
    case 10:
      if (descString!.indexOf('%%') < 0) {
        value = `${(v * 100) / 128}%`;
      } else {
        value = (v * 100) / 128;
      }
      break;
    case 11:
      property.description = descString!.replace(/%d/, (v / 100).toString());
      break;
    case 13: {
      const clazz = data.classes[property.values[0]];
      property.description = `${sign}${v} ${clazz.allSkillsString}`;
      break;
    }
    case 14: {
      const clazz = data.classes[property.values[1]];
      const skillTabStr = clazz.skillTabStrings[property.values[0]];
      descString = sprintf(skillTabStr, v);
      property.description = `${descString} ${clazz.classOnlyString}`;
      break;
    }
    case 15:
      descString = sprintf(
        descString!,
        property.values[2],
        property.values[0],
        data.skills[property.values[1]]?.skillName,
      );
      property.description = `${descString}`;
      break;
    case 16:
      property.description = descString!.replace(/%d/, v.toString());
      property.description = property.description.replace(
        /%s/,
        data.skills[property.values[0]]?.skillName ?? '',
      );
      break;
    case 17:
      property.description = `${v} ${descString} (Increases near [time])`;
      break;
    case 18:
      property.description = `${v}% ${descString} (Increases near [time])`;
      break;
    case 19:
      property.description = sprintf(descString!, v.toString());
      break;
    case 20:
      value = `${v * -1}%`;
      break;
    case 21:
      value = `${v * -1}`;
      break;
    case 22:
      property.description = `${v}% ${descString} [montype]`;
      break;
    case 23:
      property.description = `${v}% ${descString} [monster]]`;
      break;
    case 24:
      // charges
      if (descString!.indexOf('(') == 0) {
        let count = 0;
        descString = descString!.replace(/%d/gi, () => {
          return property.values[2 + count++].toString();
        });
        property.description = `Level ${property.values[0]} ${data.skills[property.values[1]]?.skillName} ${descString}`;
      } else {
        property.description = sprintf(
          descString!,
          property.values[0],
          data.skills[property.values[1]]?.skillName,
          property.values[2],
          property.values[3],
        );
      }
      break;
    case 27: {
      const skill = data.skills[property.values[0]];
      const clazz = classFromCode(skill?.classCode, data);
      if (descString) {
        property.description = sprintf(
          descString,
          v,
          skill?.skillName,
          clazz?.classOnlyString,
        );
      } else {
        property.description = `${sign}${v} to ${skill?.skillName} ${clazz?.classOnlyString}`;
      }
      break;
    }
    case 28: {
      const skill = data.skills[property.values[0]];
      property.description = `${sign}${v} to ${skill?.skillName}`;
      break;
    }
    case 29:
      property.description = sprintf(descString!, v.toString());
      break;
    default:
      throw new Error(`No handler for descFunc: ${descFunc}`);
  }
  if (value) {
    descVal = descVal ? descVal : 0;
    switch (descVal) {
      case 0:
        property.description = sprintf(descString!, value);
        break;
      case 1:
        property.description = `${value} ${descString}`;
        break;
      case 2:
        property.description = `${descString} ${value}`;
        break;
      default:
        throw new Error(`No handler for descVal: ${descVal}`);
    }
  }
  if (hasDescExtra) {
    property.description += ` ${descExtraStr}`;
  }
}

function sprintf(str: string, ...args: any[]): string {
  let i = 0;
  return str
    .replace(/%\+?d|%\+?s/gi, (m) => {
      let v = args[i++]?.toString() ?? '';
      if (m.indexOf('+') >= 0) {
        v = '+' + v;
      }
      return v;
    })
    .replace('%%', '%');
}

function itemStatCostFromStat(statName: string, data: EnhancerData): number {
  return data.magicalProperties.findIndex((e) => e?.stat === statName);
}

function classFromCode(
  code: string | undefined,
  data: EnhancerData,
): ClassInfo | undefined {
  return data.classes.find((e) => e.code === code);
}

function allAttributes(item: IItem): IMagicProperty[] {
  let socketed_attributes = [] as IMagicProperty[];
  if (item.socketed_items) {
    for (const socketedItem of item.socketed_items) {
      if (socketedItem.magic_attributes) {
        socketed_attributes = socketed_attributes.concat(
          ...JSON.parse(JSON.stringify(socketedItem.magic_attributes)),
        );
      }
    }
  }
  const magic_attributes = item.magic_attributes || [];
  const runeword_attributes = item.runeword_attributes || [];
  return [
    ...[],
    ...JSON.parse(JSON.stringify(magic_attributes)),
    ...JSON.parse(JSON.stringify(runeword_attributes)),
    ...JSON.parse(JSON.stringify(socketed_attributes)),
  ].filter((attribute) => attribute != null);
}

function groupAttributes(
  all_attributes: IMagicProperty[],
  data: EnhancerData,
): IMagicProperty[] {
  const combined_magic_attributes = [] as IMagicProperty[];
  for (const magic_attribute of all_attributes) {
    const prop = data.magicalProperties[magic_attribute.id];
    const matchingProperties = combined_magic_attributes.filter((e) => {
      // encoded skills need to look at those params too
      if (prop.encode === 3) {
        return (
          e.id === magic_attribute.id &&
          e.values[0] === magic_attribute.values[0] &&
          e.values[1] === magic_attribute.values[1]
        );
      }
      if (prop.descFunc === 15) {
        return (
          e.id === magic_attribute.id &&
          e.values[0] === magic_attribute.values[0] &&
          e.values[1] === magic_attribute.values[1] &&
          e.values[2] === magic_attribute.values[2]
        );
      }
      if (prop.descFunc === 16 || prop.descFunc === 23) {
        return (
          e.id === magic_attribute.id &&
          e.values[0] === magic_attribute.values[0] &&
          e.values[1] === magic_attribute.values[1]
        );
      }
      if (prop.stat === 'state' || prop.stat === 'item_nonclassskill') {
        return (
          e.id === magic_attribute.id &&
          e.values[0] === magic_attribute.values[0] &&
          e.values[1] === magic_attribute.values[1]
        );
      }
      return e.id === magic_attribute.id;
    });
    if (matchingProperties && matchingProperties.length) {
      for (let i = 0; i < matchingProperties.length; i++) {
        const existing = matchingProperties[i];
        if (prop.numProps) {
          // damage props
          existing.values[0] += magic_attribute.values[0];
          existing.values[1] += magic_attribute.values[1];
          break;
        }
        // only combine attributes if the params for the descFunc are the same
        let sameParams = true;
        const numValues = prop.encode === 3 ? 2 : 1;
        for (let j = 0; j < existing.values.length - numValues; j++) {
          sameParams = existing.values[j] === magic_attribute.values[j];
          if (!sameParams) break;
        }
        if (sameParams) {
          for (let j = 1; j <= numValues; j++) {
            const idx = existing.values.length - j;
            existing.values[idx] += magic_attribute.values[idx];
          }
        } else {
          combined_magic_attributes.push({
            id: magic_attribute.id,
            values: magic_attribute.values,
            name: magic_attribute.name,
          } as IMagicProperty);
        }
      }
    } else {
      combined_magic_attributes.push({
        id: magic_attribute.id,
        values: magic_attribute.values,
        name: magic_attribute.name,
      } as IMagicProperty);
    }
  }
  return combined_magic_attributes;
}
