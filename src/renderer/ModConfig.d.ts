import { Binding } from './Bindings';
import { ModConfigSingleValue } from './ModConfigValue';

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
  | ModConfigFieldSelect
  | ModConfigFieldColor;

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
 * Represents a color configuration field that will be represented as a color picker
 * element in the configuration UI.
 */
export type ModConfigFieldColor = ModConfigFieldBase & {
  type: 'color';
  defaultValue: [number, number, number, number];
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
