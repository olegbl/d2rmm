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
};

type ModConfigSingleValue = string | number | boolean | string[] | number[];

// this is the structure of the mod config as it is passed to the mod's implementation
export type ModConfigValue = Readonly<{
  [key: string]: ModConfigSingleValue;
}>;
