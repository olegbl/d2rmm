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

export type BindingConfigValue = ['value', id: string];

export type Binding<T extends ModConfigSingleValue> =
  // string
  T extends string
    ? string | BindingConfigValue
    : // number
    T extends number
    ? number | BindingConfigValue
    : // boolean
    T extends boolean
    ?
        | boolean
        | BindingConfigValue
        | ['not', Binding<boolean>]
        | ['and', Binding<boolean>, Binding<boolean>]
        | ['or', Binding<boolean>, Binding<boolean>]
        | ['eq', Binding<string>, Binding<string>]
        | ['eq', Binding<boolean>, Binding<boolean>]
        | ['eq', Binding<number>, Binding<number>]
        | ['neq', Binding<string>, Binding<string>]
        | ['neq', Binding<boolean>, Binding<boolean>]
        | ['neq', Binding<number>, Binding<number>]
        | ['lt', Binding<number>, Binding<number>]
        | ['lte', Binding<number>, Binding<number>]
        | ['gt', Binding<number>, Binding<number>]
        | ['gte', Binding<number>, Binding<number>]
        | ['in', Binding<string>, Binding<string[]>]
        | ['in', Binding<number>, Binding<number[]>]
    : // string[]
    T extends string[]
    ? Exclude<string[], BindingConfigValue> | BindingConfigValue
    : // number[]
    T extends number[]
    ? number[] | BindingConfigValue
    : // fallthrough
      never;
