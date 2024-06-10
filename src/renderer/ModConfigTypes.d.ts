/**
 * This is the structure of the "mod.json" file that D2RMM mods should provide.
 */
export type ModConfig = {
  /**
   * The name of the mod.
   */
  name: string;
  /**
   * A short description of the mod.
   */
  description?: string;
  /**
   * The author of the mod.
   */
  author?: string;
  /**
   * The website of the mod. Ideally, this should link to the Nexus Mods page for the mod.
   */
  website?: string;
  /**
   * The version of the mod.
   */
  version?: string;
  /**
   * The configuration for the mod. This allows the mod to set up a custom configuration UI
   * that the user can interact with to customize the behavior of the mod.
   */
  config?: readonly ModConfigFieldOrSection[];
};

/**
 * Represents a single configuration field or section.
 */
export type ModConfigFieldOrSection = ModConfigFieldSection | ModConfigField;

/**
 * Represents a section in the configuration UI that can contain other fields or sections.
 */
export type ModConfigFieldSection = {
  type: 'section';
  id: string;
  name: string;
  defaultExpanded?: boolean;
  children?: readonly ModConfigFieldOrSection[];
};

/**
 * Represents a single configuration field.
 */
export type ModConfigField =
  | ModConfigFieldCheckbox
  | ModConfigFieldNumber
  | ModConfigFieldText
  | ModConfigFieldSelect;

/**
 * Represents a boolean (true/false) configuration field that will be represented
 * as a checkbox or toggle element in the configuration UI.
 */
export type ModConfigFieldCheckbox = ModConfigFieldBase & {
  type: 'checkbox';
  defaultValue: boolean;
};

/**
 * Represents a number configuration field that will be represented as a number
 * input in the configuration UI.
 */
export type ModConfigFieldNumber = ModConfigFieldBase & {
  type: 'number';
  defaultValue: number;
  minValue?: number;
  maxValue?: number;
};

/**
 * Represents a text configuration field that will be represented as a text input
 * in the configuration UI.
 */
export type ModConfigFieldText = ModConfigFieldBase & {
  type: 'text';
  defaultValue: number;
};

/**
 * Represents a select configuration field that will be represented as a dropdown
 * select element in the configuration UI.
 */
export type ModConfigFieldSelect = ModConfigFieldBase & {
  type: 'select';
  defaultValue: string;
  options: {
    description?: string;
    label: string;
    value: ModConfigSingleValue;
  }[];
};

/**
 * Represents the base structure of any configuration field.
 */
export type ModConfigFieldBase = {
  id: string;
  name: string;
  description: string;
  visible?: Binding<boolean>;
};

/**
 * Represents the valid value of any single configuration field.
 */
type ModConfigSingleValue = string | number | boolean | string[] | number[];

/**
 * This is the structure of the mod config as it is passed to the
 * mod's implementation.
 */
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
