/**
 * The name of a column in a TSV file.
 */
export type TSVDataHeader = string;

/**
 * A single row in a TSV file.
 */
export type TSVDataRow = {
  [header: TSVDataHeader]: string;
};

/**
 * The parsed data of a TSV file.
 */
export type TSVData = {
  /**
   * List of headers in the TSV file.
   */
  headers: TSVDataHeader[];
  /**
   * List of rows in the TSV file.
   */
  rows: TSVDataRow[];
};
