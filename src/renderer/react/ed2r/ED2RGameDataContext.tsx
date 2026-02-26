import type { IItem, IMagicProperty } from 'bridge/third-party/d2s/d2/types';
import { useGameFiles } from 'renderer/react/ed2r/ED2RGameFilesContext';
import React, { useMemo } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Strings = { [key: string]: string };

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

export type GameData = {
  strings: Strings;
  magicalProperties: MagicalProperty[];
  skills: SkillInfo[];
  classes: ClassInfo[];
  /** Raw TSV row from armor/weapons/misc keyed by item code */
  itemCodeToItem: { [code: string]: TSVDataRow };
  /** Category hierarchy keyed by raw item type code */
  itemCodeToCategories: { [code: string]: string[] };
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// NOTE: these properties are hard coded in the binary
//       rather than in itemstatcost.txt, so we have to
//       hard code them in the save editor as well
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

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

function buildStrings(gameFiles: Record<string, unknown>): Strings {
  const result: Strings = {};
  for (const filePath of [
    'local/lng/strings/item-gems.json',
    'local/lng/strings/item-modifiers.json',
    'local/lng/strings/item-nameaffixes.json',
    'local/lng/strings/item-names.json',
    'local/lng/strings/item-runes.json',
    'local/lng/strings/skills.json',
  ]) {
    const data = gameFiles[filePath] as { Key: string; enUS: string }[] | null;
    if (data == null) continue;
    for (const entry of data) {
      result[entry.Key] = entry.enUS;
    }
  }
  return result;
}

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

function buildCategoryHierarchy(gameFiles: Record<string, unknown>): {
  [typeCode: string]: string[];
} {
  const tsv = gameFiles['global/excel/itemtypes.txt'] as TSVData;
  if (tsv == null) return {};

  const raw: {
    [code: string]: { name: string; equiv1?: string; equiv2?: string };
  } = {};
  for (const row of tsv.rows) {
    const code = row.Code;
    if (!code) continue;
    raw[code] = {
      name: row.ItemType,
      equiv1: row.Equiv1 || undefined,
      equiv2: row.Equiv2 || undefined,
    };
  }

  function resolveCategories(code: string): string[] {
    const entry = raw[code];
    if (!entry) return [];
    return [
      entry.name,
      ...resolveCategories(entry.equiv1 ?? ''),
      ...resolveCategories(entry.equiv2 ?? ''),
    ];
  }

  const result: { [typeCode: string]: string[] } = {};
  for (const code of Object.keys(raw)) {
    result[code] = resolveCategories(code);
  }
  return result;
}

function buildItemCodeToItem(gameFiles: Record<string, unknown>): {
  [code: string]: TSVDataRow;
} {
  const result: { [code: string]: TSVDataRow } = {};
  for (const filePath of [
    'global/excel/armor.txt',
    'global/excel/weapons.txt',
    'global/excel/misc.txt',
  ]) {
    const tsv = gameFiles[filePath] as TSVData;
    if (tsv == null) continue;
    for (const row of tsv.rows) {
      if (row.code) result[row.code] = row;
    }
  }
  return result;
}

function buildCategoriesByCode(
  itemCodeToItem: { [code: string]: TSVDataRow },
  categoryHierarchy: { [typeCode: string]: string[] },
): { [code: string]: string[] } {
  const result: { [code: string]: string[] } = {};
  for (const [code, row] of Object.entries(itemCodeToItem)) {
    result[code] = categoryHierarchy[row.type] ?? [];
  }
  return result;
}

function buildGameData(gameFiles: Record<string, unknown>): GameData {
  if (Object.keys(gameFiles).length === 0) {
    return {
      strings: {},
      magicalProperties: [],
      skills: [],
      classes: [],
      itemCodeToItem: {},
      itemCodeToCategories: {},
    };
  }

  const strings = buildStrings(gameFiles);
  const skillDescs = buildSkillDescs(
    gameFiles['global/excel/skilldesc.txt'] as TSVData,
    strings,
  );
  const categoryHierarchy = buildCategoryHierarchy(gameFiles);
  const itemCodeToItem = buildItemCodeToItem(gameFiles);

  return {
    strings,
    magicalProperties: buildMagicalProperties(
      gameFiles['global/excel/itemstatcost.txt'] as TSVData,
      strings,
    ),
    skills: buildSkills(
      gameFiles['global/excel/skills.txt'] as TSVData,
      skillDescs,
    ),
    classes: buildClasses(
      gameFiles['global/excel/charstats.txt'] as TSVData,
      gameFiles['global/excel/playerclass.txt'] as TSVData,
      strings,
    ),
    itemCodeToItem,
    itemCodeToCategories: buildCategoriesByCode(
      itemCodeToItem,
      categoryHierarchy,
    ),
  };
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export type IGameDataContext = {
  gameData: GameData;
};

const GameDataContext = React.createContext<IGameDataContext | null>(null);

export function GameDataContextProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  const { gameFiles } = useGameFiles();
  const gameData = useMemo(() => buildGameData(gameFiles), [gameFiles]);

  const context = useMemo(() => ({ gameData }), [gameData]);

  return (
    <GameDataContext.Provider value={context}>
      {children}
    </GameDataContext.Provider>
  );
}

export function useGameData(): IGameDataContext {
  const context = React.useContext(GameDataContext);
  if (context == null) {
    throw new Error('useGameData used outside of a GameDataContextProvider');
  }
  return context;
}

// ---------------------------------------------------------------------------
// Attribute collection — works on raw IItem fields from the binary parser
// ---------------------------------------------------------------------------

export function allAttributes(item: IItem): IMagicProperty[] {
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

export function groupAttributes(
  all_attributes: IMagicProperty[],
  data: GameData,
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

export function enhanceAttributeDescription(
  _magic_attributes: IMagicProperty[],
  data: GameData,
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

// ---------------------------------------------------------------------------
// Private formatting helpers
// ---------------------------------------------------------------------------

function classFromCode(
  code: string | undefined,
  data: GameData,
): ClassInfo | undefined {
  return data.classes.find((e) => e.code === code);
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

function descFuncHandler(
  property: IMagicProperty,
  data: GameData,
  v: number,
  descFunc: number | undefined,
  descVal: number | undefined,
  descString: string | undefined,
  descExtraStr: string | undefined,
): void {
  if (!descFunc) return;

  const sign = v >= 0 ? '+' : '';
  let value: string | number | null = null;
  const hasDescExtra = (descFunc >= 6 && descFunc <= 10) || descFunc === 26;
  switch (descFunc) {
    case 1:
    case 6:
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
    case 12:
      value = v > 1 ? `+${v}` : v < 0 ? `-${v}` : `${v}`;
      break;
    case 13: {
      const clazz = data.classes[property.values[0]];
      property.description = sprintf(clazz.allSkillsString, v);
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
      value = `${v * -1}%`;
      break;
    case 25:
    case 26:
      value = `+${v * -1}`;
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
      property.description = sprintf(descString!, Math.abs(v).toString());
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
