/**
 * The parsed data of a JSON file.
 */
export type JSONData =
  | boolean
  | number
  | string
  | JSONData[]
  | { [key: string]: JSONData };
