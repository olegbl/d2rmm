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
  visible?: Binding<boolean>;
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

type BindingLiteralValue<T> = T;

type BindingConfigValue<_T extends ModConfigSingleValue> = [
  operator: 'value',
  id: string
];

type BindingConditional<T> = [
  operator: 'if',
  condition: Binding<boolean>,
  thenBinding: Binding<T>,
  elseBinding: Binding<T>
];

type BindingNot = [operator: 'not', binding: Binding<boolean>];

type BindingAnd = [
  operator: 'and',
  binding1: Binding<boolean>,
  binding2: Binding<boolean>
];

type BindingOr = [
  operator: 'or',
  binding1: Binding<boolean>,
  binding2: Binding<boolean>
];

type BindingEquals<T> = [
  operator: 'eq',
  binding1: Binding<T>,
  binding2: Binding<T>
];

type BindingNotEquals<T> = [
  operator: 'neq',
  binding1: Binding<T>,
  binding2: Binding<T>
];

type BindingLessThan = [
  operator: 'lt',
  binding1: Binding<number>,
  binding2: Binding<number>
];

type BindingLessThanOrEqual = [
  operator: 'lte',
  binding1: Binding<number>,
  binding2: Binding<number>
];

type BindingGreaterThan = [
  operator: 'gt',
  binding1: Binding<number>,
  binding2: Binding<number>
];

type BindingGreaterThanOrEqual = [
  operator: 'gte',
  binding1: Binding<number>,
  binding2: Binding<number>
];

type BindingIncludes<T> = [
  operator: 'in',
  binding1: Binding<T>,
  binding2: T extends string
    ? Binding<string[]>
    : T extends number
    ? Binding<number[]>
    : never
];

export type Binding<T> =
  // string
  T extends string
    ?
        | BindingLiteralValue<string>
        | BindingConfigValue<string>
        | BindingConditional<boolean>
    : // number
    T extends number
    ?
        | BindingLiteralValue<number>
        | BindingConfigValue<number>
        | BindingConditional<boolean>
    : // boolean
    T extends boolean
    ?
        | BindingLiteralValue<boolean>
        | BindingConfigValue<boolean>
        | BindingConditional<boolean>
        | BindingNot
        | BindingAnd
        | BindingOr
        | BindingEquals<string>
        | BindingEquals<boolean>
        | BindingEquals<number>
        | BindingNotEquals<string>
        | BindingNotEquals<boolean>
        | BindingNotEquals<number>
        | BindingLessThan
        | BindingLessThanOrEqual
        | BindingGreaterThan
        | BindingGreaterThanOrEqual
        | BindingIncludes<string>
        | BindingIncludes<number>
    : // string[]
    T extends string[]
    ?
        | BindingLiteralValue<string[]>
        | BindingConfigValue<string[]>
        | BindingConditional<boolean>
    : // number[]
    T extends number[]
    ?
        | BindingLiteralValue<number[]>
        | BindingConfigValue<number[]>
        | BindingConditional<boolean>
    : // fallthrough
      BindingLiteralValue<T>;
