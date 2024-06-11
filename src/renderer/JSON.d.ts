/**
 * A single value in a JSON data structure.
 */
export type JSONDataValue = string | number | boolean;

/**
 * One or more value in a JSON data structure.
 */
export type JSONDataValues = JSONDataValue | JSONDataValue[];

/**
 * The parsed data of a JSON file.
 */
export type JSONData = { [key: string]: JSONDataValues | JSONData };
