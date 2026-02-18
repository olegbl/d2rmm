import type * as types from 'bridge/third-party/d2s/d2/types.d';

enum ItemType {
  Armor = 0x01,
  Shield = 0x02, //treated the same as armor... only here to be able to parse nokkas jsons
  Weapon = 0x03,
  Other = 0x04,
}

//do nice stuff
//combine group properties (all resists/all stats) and build friendly strings for a ui
//enhanced def/durability/weapon damage.
//lookup socketed compact items (runes/gems) properties for the slot they are in
//compute attributes like str/resists/etc..
export async function enhanceAttributes(
  char: types.ID2S,
  constants: types.IConstantData,
  config?: types.IConfig,
) {
  enhanceItems(char.items, constants, char.attributes.level, config);
  enhanceItems([char.golem_item], constants, char.attributes.level, config);
  enhanceItems(char.merc_items, constants, char.attributes.level, config);
  enhanceItems(char.corpse_items, constants, char.attributes.level, config);
  enhancePlayerAttributes(char, constants, config);
}

export function enhancePlayerAttributes(
  char: types.ID2S,
  constants: types.IConstantData,
  config?: types.IConfig,
) {
  const items = char.items.filter((item) => {
    return (
      item.location_id === 1 &&
      item.equipped_id !== 13 &&
      item.equipped_id !== 14
    );
  });

  char.item_bonuses = ([] as types.IMagicProperty[]).concat
    .apply(
      [],
      items.map((item) => _allAttributes(item, constants)),
    )
    .filter((attribute) => attribute != null);
  char.item_bonuses = _groupAttributes(char.item_bonuses, constants);
  _enhanceAttributeDescription(
    char.item_bonuses,
    constants,
    char.attributes.level,
    config,
  );
}

export function enhanceItems(
  items: types.IItem[],
  constants: types.IConstantData,
  level = 1,
  config?: types.IConfig,
  parent?: types.IItem,
) {
  if (!items) {
    return;
  }
  for (const item of items) {
    if (!item) {
      continue;
    }
    if (item.socketed_items && item.socketed_items.length) {
      enhanceItems(item.socketed_items, constants, level, config, item);
    }
    enhanceItem(item, constants, level, config, parent);
  }
}

export function enhanceItem(
  item: types.IItem,
  constants: types.IConstantData,
  level = 1,
  config?: types.IConfig,
  parent?: types.IItem,
) {
  if (parent) {
    //socket item.
    const pt =
      constants.armor_items[parent.type] ||
      constants.weapon_items[parent.type] ||
      constants.other_items[item.type];
    const t = constants.other_items[item.type];
    if (t.m) {
      item.magic_attributes = _compactAttributes(t.m[pt.gt], constants);
    }
  }
  let details = null;
  if (constants.armor_items[item.type]) {
    details = constants.armor_items[item.type];
    item.type_id = ItemType.Armor;
    if (details.maxac) {
      if (item.ethereal == 0) {
        item.defense_rating = details.maxac;
      } else if (item.ethereal == 1) {
        item.defense_rating = Math.floor(details.maxac * 1.5);
      }
    }
  } else if (constants.weapon_items[item.type]) {
    details = constants.weapon_items[item.type];
    item.type_id = ItemType.Weapon;
    const base_damage = {} as types.IWeaponDamage;
    if (item.ethereal == 0) {
      if (details.mind) base_damage.mindam = details.mind;
      if (details.maxd) base_damage.maxdam = details.maxd;
      if (details.min2d) base_damage.twohandmindam = details.min2d;
      if (details.max2d) base_damage.twohandmaxdam = details.max2d;
    } else if (item.ethereal == 1) {
      if (details.mind) base_damage.mindam = Math.floor(details.mind * 1.5);
      if (details.maxd) base_damage.maxdam = Math.floor(details.maxd * 1.5);
      if (details.min2d)
        base_damage.twohandmindam = Math.floor(details.min2d * 1.5);
      if (details.max2d)
        base_damage.twohandmaxdam = Math.floor(details.max2d * 1.5);
    }
    item.base_damage = base_damage;
  } else if (constants.other_items[item.type]) {
    item.type_id = ItemType.Other;
    details = constants.other_items[item.type];
  }
  if (details) {
    if (details.n) item.type_name = details.n;
    if (details.rs) item.reqstr = details.rs;
    if (details.rd) item.reqdex = details.rd;
    if (details.i) item.inv_file = details.i;
    if (details.ih) item.inv_height = details.ih;
    if (details.iw) item.inv_width = details.iw;
    if (details.it) item.inv_transform = details.it;
    if (details.iq) item.item_quality = details.iq;
    if (details.c) item.categories = details.c;
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
    if (item.multiple_pictures) {
      item.inv_file = details.ig[item.picture_id];
    }
    if (item.magic_prefix || item.magic_suffix) {
      if (
        item.magic_prefix &&
        constants.magic_prefixes[item.magic_prefix]?.tc
      ) {
        item.transform_color = constants.magic_prefixes[item.magic_prefix].tc;
      }
      if (
        item.magic_suffix &&
        constants.magic_suffixes[item.magic_suffix]?.tc
      ) {
        item.transform_color = constants.magic_suffixes[item.magic_suffix].tc;
      }
    } else if (item.magical_name_ids && item.magical_name_ids.length === 6) {
      for (let i = 0; i < 6; i++) {
        const id = item.magical_name_ids[i];
        if (id) {
          if (
            i % 2 == 0 &&
            constants.magic_prefixes[id] &&
            constants.magic_prefixes[id]?.tc
          ) {
            // even is prefixes
            item.transform_color = constants.magic_prefixes[id].tc;
          } else if (
            constants.magic_suffixes[id] &&
            constants.magic_suffixes[id]?.tc
          ) {
            // odd is suffixes
            item.transform_color = constants.magic_suffixes[id].tc;
          }
        }
      }
    } else if (item.unique_id) {
      const unq = constants.unq_items[item.unique_id];
      if (details.ui) item.inv_file = details.ui;
      if (unq && unq.i) item.inv_file = unq.i;
      if (unq && unq.tc) item.transform_color = unq.tc;
    } else if (item.set_id) {
      const set = constants.set_items[item.set_id];
      if (details.ui) item.inv_file = details.ui;
      if (set && set.i) item.inv_file = set.i;
      if (set && set.tc) item.transform_color = set.tc;
    }
  }

  if (
    item.magic_attributes ||
    item.runeword_attributes ||
    item.socketed_items
  ) {
    item.displayed_magic_attributes = _enhanceAttributeDescription(
      item.magic_attributes,
      constants,
      level,
      config,
    );
    item.displayed_runeword_attributes = _enhanceAttributeDescription(
      item.runeword_attributes,
      constants,
      level,
      config,
    );
    item.combined_magic_attributes = _groupAttributes(
      _allAttributes(item, constants),
      constants,
    );
    item.displayed_combined_magic_attributes = _enhanceAttributeDescription(
      item.combined_magic_attributes,
      constants,
      level,
      config,
    );
  }
}

function _enhanceAttributeDescription(
  _magic_attributes: types.IMagicProperty[],
  constants: types.IConstantData,
  level = 1,
  _config?: types.IConfig,
): types.IMagicProperty[] {
  if (!_magic_attributes) return [];

  const magic_attributes: types.IMagicProperty[] = [
    ..._magic_attributes.map((attr) => ({ ...attr })),
  ];
  const dgrps = [0, 0, 0];
  const dgrpsVal = [0, 0, 0];
  for (const property of magic_attributes) {
    const prop = constants.magical_properties[property.id];
    const v = property.values[property.values.length - 1];
    if (prop.dg) {
      if (dgrpsVal[prop.dg - 1] === 0) {
        dgrpsVal[prop.dg - 1] = v;
      }
      if (dgrpsVal[prop.dg - 1] - v === 0) {
        dgrps[prop.dg - 1]++;
      }
    }
  }
  for (const property of magic_attributes) {
    const prop = constants.magical_properties[property.id];
    if (prop == null) {
      throw new Error(`Cannot find Magical Property for id: ${property.id}`);
    }
    let v = property.values[property.values.length - 1];
    if (prop.ob === 'level') {
      switch (prop.o) {
        case 1: {
          v = Math.floor((level * v) / 100);
          break;
        }
        case 2:
        case 3:
        case 4:
        case 5: {
          v = Math.floor((level * v) / 2 ** prop.op);
          break;
        }
        default: {
          break;
        }
      }
      property.op_stats = prop.os;
      property.op_value = v;
    }
    let descFunc = prop.dF;
    let descString = v >= 0 ? prop.dP : prop.dN;
    //hack for d2r...?
    if (
      property.id == 39 ||
      property.id == 41 ||
      property.id == 43 ||
      property.id == 45
    ) {
      descString = prop.dP;
    }
    let descVal = prop.dV;
    let desc2 = prop.d2;
    if (prop.dg && dgrps[prop.dg - 1] === 4) {
      v = dgrpsVal[prop.dg - 1];
      descString = v >= 0 ? prop.dgP : prop.dgN ? prop.dgN : prop.dgP;
      descVal = prop.dgV;
      descFunc = prop.dgF;
      desc2 = prop.dg2;
    }
    if (prop.np) {
      //damage range or enhanced damage.
      let count = 0;
      descString = prop.dR;

      if (prop.s === 'poisonmindam') {
        //poisonmindam see https://user.xmission.com/~trevin/DiabloIIv1.09_Magic_Properties.shtml for reference
        const min = Math.floor((property.values[0] * property.values[2]) / 256);
        const max = Math.floor((property.values[1] * property.values[2]) / 256);
        const seconds = Math.floor(property.values[2] / 25);
        property.values = [min, max, seconds];
      }

      if (property.values[0] === property.values[1]) {
        count++;
        descString = prop.dE;
        //TODO. why???
        if (prop.s === 'item_maxdamage_percent') {
          descString = `+%d% ${descString.replace(/}/gi, '').replace(/%\+?d%%/gi, '')}`;
        }
      }
      property.description = descString.replace(/%d/gi, () => {
        const v = property.values[count++];
        return v;
      });
    } else {
      _descFunc(property, constants, v, descFunc, descVal, descString, desc2);
    }
  }

  //sort using sort order from game.
  magic_attributes.sort(
    (a, b) =>
      constants.magical_properties[b.id].so -
      constants.magical_properties[a.id].so,
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

function _compactAttributes(
  mods: any[],
  constants: types.IConstantData,
): types.IMagicProperty[] {
  const magic_attributes = [] as types.IMagicProperty[];
  for (const mod of mods) {
    const properties = constants.properties[mod.m] || [];
    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];
      let stat = property.s;
      switch (property.f) {
        case 5: {
          stat = 'mindamage';
          break;
        }
        case 6: {
          stat = 'maxdamage';
          break;
        }
        case 7: {
          stat = 'item_maxdamage_percent';
          break;
        }
        case 20: {
          stat = 'item_indesctructible';
          break;
        }
        default: {
          break;
        }
      }
      const id = _itemStatCostFromStat(stat, constants);
      const prop = constants.magical_properties[id];
      if (prop.np) i += prop.np;
      const v = [mod.min, mod.max];
      if (mod.p) {
        v.push(mod.p);
      }
      magic_attributes.push({
        id: id,
        values: v,
        name: prop.s,
      } as types.IMagicProperty);
    }
  }
  return magic_attributes;
}

function _descFunc(
  property: types.IMagicProperty,
  constants: types.IConstantData,
  v: number,
  descFunc: number,
  descVal: number,
  descString: string,
  desc2: string,
) {
  if (!descFunc) {
    return;
  }
  const sign = v >= 0 ? '+' : '';
  let value = null;
  const desc2Present = descFunc >= 6 && descFunc <= 10;
  switch (descFunc) {
    case 1:
    case 6:
    case 12: {
      value = `${sign}${v}`;
      break;
    }
    case 2:
    case 7: {
      value = `${v}%`;
      break;
    }
    case 3:
    case 9: {
      value = `${v}`;
      break;
    }
    case 4:
    case 8: {
      value = `${sign}${v}%`;
      break;
    }
    case 5:
    case 10: {
      if (descString.indexOf('%%') < 0) {
        value = `${(v * 100) / 128}%`;
      } else {
        value = (v * 100) / 128;
      }
      break;
    }
    case 11: {
      property.description = descString.replace(/%d/, (v / 100).toString());
      break;
    }
    case 13: {
      const clazz = constants.classes[property.values[0]];
      property.description = `${sign}${v} ${clazz.as}`;
      break;
    }
    case 14: {
      const clazz = constants.classes[property.values[1]];
      const skillTabStr = clazz.ts[property.values[0]];
      descString = _sprintf(skillTabStr, v);
      property.description = `${descString} ${clazz.co}`;
      break;
    }
    case 15: {
      descString = _sprintf(
        descString,
        property.values[2],
        property.values[0],
        constants.skills[property.values[1]].s,
      );
      property.description = `${descString}`;
      break;
    }
    case 16: {
      property.description = descString.replace(/%d/, v.toString());
      property.description = property.description.replace(
        /%s/,
        constants.skills[property.values[0]].s,
      );
      break;
    }
    case 17: {
      //todo
      property.description = `${v} ${descString} (Increases near [time])`;
      break;
    }
    case 18: {
      //todo
      property.description = `${v}% ${descString} (Increases near [time])`;
      break;
    }
    case 19: {
      property.description = _sprintf(descString, v.toString());
      break;
    }
    case 20: {
      value = `${v * -1}%`;
      break;
    }
    case 21: {
      value = `${v * -1}`;
      break;
    }
    case 22: {
      //todo
      property.description = `${v}% ${descString} [montype]`;
      break;
    }
    case 23: {
      //todo
      property.description = `${v}% ${descString} [monster]]`;
      break;
    }
    case 24: {
      //charges
      //legacy desc string
      if (descString.indexOf('(') == 0) {
        let count = 0;
        descString = descString.replace(/%d/gi, () => {
          return property.values[2 + count++].toString();
        });
        property.description = `Level ${property.values[0]} ${constants.skills[property.values[1]].s} ${descString}`;
      } else {
        property.description = _sprintf(
          descString,
          property.values[0],
          constants.skills[property.values[1]].s,
          property.values[2],
          property.values[3],
        );
      }
      break;
    }
    case 27: {
      const skill = constants.skills[property.values[0]];
      const clazz = _classFromCode(skill.c, constants);
      if (descString) {
        property.description = _sprintf(descString, v, skill?.s, clazz?.co);
      } else {
        property.description = `${sign}${v} to ${skill?.s} ${clazz?.co}`;
      }
      break;
    }
    case 28: {
      const skill = constants.skills[property.values[0]];
      property.description = `${sign}${v} to ${skill?.s}`;
      break;
    }
    case 29: {
      property.description = _sprintf(descString, v.toString());
      break;
    }
    default: {
      throw new Error(`No handler for descFunc: ${descFunc}`);
    }
  }
  if (value) {
    descVal = descVal ? descVal : 0;
    switch (descVal) {
      case 0: {
        property.description = _sprintf(descString, value);
        break;
      }
      case 1: {
        property.description = `${value} ${descString}`;
        break;
      }
      case 2: {
        property.description = `${descString} ${value}`;
        break;
      }
      default: {
        throw new Error(`No handler for descVal: ${descVal}`);
      }
    }
  }
  if (desc2Present) {
    property.description += ` ${desc2}`;
  }
}

function _sprintf(str: string, ...args: any[]): string {
  let i = 0;
  return str
    .replace(/%\+?d|%\+?s/gi, (m) => {
      let v = args[i++].toString();
      if (m.indexOf('+') >= 0) {
        v = '+' + v;
      }
      return v;
    })
    .replace('%%', '%');
}

function _itemStatCostFromStat(
  stat: string,
  constants: types.IConstantData,
): number {
  return constants.magical_properties.findIndex((e) => e.s === stat);
}

function _classFromCode(code: string, constants: types.IConstantData): any {
  return constants.classes.filter((e) => e.c === code)[0];
}

function _allAttributes(
  item: types.IItem,
  _constants: types.IConstantData,
): types.IMagicProperty[] {
  let socketed_attributes = [] as types.IMagicProperty[];
  if (item.socketed_items) {
    for (const i of item.socketed_items) {
      if (i.magic_attributes) {
        socketed_attributes = socketed_attributes.concat(
          ...JSON.parse(JSON.stringify(i.magic_attributes)),
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

function _groupAttributes(
  all_attributes: types.IMagicProperty[],
  constants: types.IConstantData,
): types.IMagicProperty[] {
  const combined_magic_attributes = [] as types.IMagicProperty[];
  for (const magic_attribute of all_attributes) {
    const prop = constants.magical_properties[magic_attribute.id];
    const properties = combined_magic_attributes.filter((e) => {
      //encoded skills need to look at those params too.
      if (prop.e === 3) {
        return (
          e.id === magic_attribute.id &&
          e.values[0] === magic_attribute.values[0] &&
          e.values[1] === magic_attribute.values[1]
        );
      }
      if (prop.dF === 15) {
        return (
          e.id === magic_attribute.id &&
          e.values[0] === magic_attribute.values[0] &&
          e.values[1] === magic_attribute.values[1] &&
          e.values[2] === magic_attribute.values[2]
        );
      }
      if (prop.dF === 16 || prop.dF === 23) {
        return (
          e.id === magic_attribute.id &&
          e.values[0] === magic_attribute.values[0] &&
          e.values[1] === magic_attribute.values[1]
        );
      }
      if (prop.s === 'state' || prop.s === 'item_nonclassskill') {
        //state
        return (
          e.id === magic_attribute.id &&
          e.values[0] === magic_attribute.values[0] &&
          e.values[1] === magic_attribute.values[1]
        );
      }
      return e.id === magic_attribute.id;
    });
    if (properties && properties.length) {
      for (let i = 0; i < properties.length; i++) {
        const property = properties[i];
        if (prop.np) {
          //damage props
          property.values[0] += magic_attribute.values[0];
          property.values[1] += magic_attribute.values[1];
          break;
        }
        //only combine attributes if the params for the descFunc are the same.
        let sameParams = true;
        const numValues = prop.e === 3 ? 2 : 1;
        for (let j = 0; j < property.values.length - numValues; j++) {
          sameParams = property.values[j] === magic_attribute.values[j];
          if (!sameParams) {
            break;
          }
        }
        if (sameParams) {
          for (let j = 1; j <= numValues; j++) {
            const idx = property.values.length - j;
            property.values[idx] += magic_attribute.values[idx];
          }
        } else {
          combined_magic_attributes.push({
            id: magic_attribute.id,
            values: magic_attribute.values,
            name: magic_attribute.name,
          } as types.IMagicProperty);
        }
      }
    } else {
      combined_magic_attributes.push({
        id: magic_attribute.id,
        values: magic_attribute.values,
        name: magic_attribute.name,
      } as types.IMagicProperty);
    }
  }
  return combined_magic_attributes;
}
