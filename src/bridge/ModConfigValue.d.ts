/**
 * Represents the valid value of any single configuration field.
 */
export type ModConfigSingleValue =
  | string
  | number
  | boolean
  | string[]
  | number[];

/**
 * This is the structure of the mod config as it is passed to the
 * mod's implementation.
 */
export type ModConfigValue = Readonly<{
  [key: string]: ModConfigSingleValue;
}>;
