// this is the structure of the "mod.json" file that D2RMM mods should provide
export type ModConfig = {
  name: string;
  description?: string;
  author?: string;
  website?: string;
  version?: string;
  config?: readonly ModConfigFieldOrSection[];
};

export type ModConfigFieldOrSection = ModConfigFieldSection | ModConfigField;

export type ModConfigFieldSection = {
  type: 'section';
  id: string;
  name: string;
  defaultExpanded?: boolean;
  children?: readonly ModConfigFieldOrSection[];
};

export type ModConfigField =
  | ModConfigFieldCheckbox
  | ModConfigFieldNumber
  | ModConfigFieldText
  | ModConfigFieldSelect;

export type ModConfigFieldCheckbox = ModConfigFieldBase & {
  type: 'checkbox';
  defaultValue: boolean;
};

export type ModConfigFieldNumber = ModConfigFieldBase & {
  type: 'number';
  defaultValue: number;
  minValue?: number;
  maxValue?: number;
};

export type ModConfigFieldText = ModConfigFieldBase & {
  type: 'text';
  defaultValue: number;
};

export type ModConfigFieldSelect = ModConfigFieldBase & {
  type: 'select';
  defaultValue: string;
  options: {
    description?: string;
    label: string;
    value: ModConfigSingleValue;
  }[];
};

export type ModConfigFieldBase = {
  id: string;
  name: string;
  description: string;
  rules?: Rule[];
};

type ModConfigSingleValue = string | number | boolean | string[] | number[];

// this is the structure of the mod config as it is passed to the mod's implementation
export type ModConfigValue = Readonly<{
  [key: string]: ModConfigSingleValue;
}>;

/**
 * Rules allow you to configure complex behavior for the configuration form based on
 * the current values of the configuration. For example, you can show or hide certain
 * fields based on the value of another field.
 */

export type RuleConfigValue = ['value', id: string];

export type RuleValue<T extends ModConfigSingleValue> =
  // string
  T extends string
    ? string | RuleConfigValue
    : // number
    T extends number
    ? number | RuleConfigValue
    : // boolean
    T extends boolean
    ?
        | boolean
        | RuleConfigValue
        | ['not', RuleValue<boolean>]
        | ['and', RuleValue<boolean>, RuleValue<boolean>]
        | ['or', RuleValue<boolean>, RuleValue<boolean>]
        | ['eq', RuleValue<string>, RuleValue<string>]
        | ['eq', RuleValue<boolean>, RuleValue<boolean>]
        | ['eq', RuleValue<number>, RuleValue<number>]
        | ['neq', RuleValue<string>, RuleValue<string>]
        | ['neq', RuleValue<boolean>, RuleValue<boolean>]
        | ['neq', RuleValue<number>, RuleValue<number>]
        | ['lt', RuleValue<number>, RuleValue<number>]
        | ['lte', RuleValue<number>, RuleValue<number>]
        | ['gt', RuleValue<number>, RuleValue<number>]
        | ['gte', RuleValue<number>, RuleValue<number>]
        | ['in', RuleValue<string>, RuleValue<string[]>]
        | ['in', RuleValue<number>, RuleValue<number[]>]
    : // string[]
    T extends string[]
    ? Exclude<string[], RuleConfigValue> | RuleConfigValue
    : // number[]
    T extends number[]
    ? number[] | RuleConfigValue
    : // fallthrough
      never;

export type ShowRule = ['show', RuleValue<boolean>];

export type HideRule = ['hide', RuleValue<boolean>];

export type Rule = ShowRule | HideRule;
