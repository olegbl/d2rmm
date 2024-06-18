import { JSONData } from './JSON';
import { TSVData } from './TSV';

/**
 * This is the interface of the global "D2RMM" variable provided to mods at runtime.
 *
 * @example
 * ```
 * const version = D2RMM.getVersion();
 * ```
 */
export interface ModAPI {
  /**
   * Returns the version of D2RMM.
   * @note You can use this API to check if the installed version of D2RMM is compatible
   *       with the APIs that your mod is using.
   * @example
   * ```
   * const version = D2RMM.getVersion(); // 1.5
   * ```
   * @returns The version including the major and the minor number.
   */
  getVersion: () => number;

  /**
   * Reads a JSON D2R file.
   * @note D2R's JSON files don't follow the standard JSON spec. This method will
   *       ignore any comments, whitespace, and various invalid properties (for example,
   *       duplicate keys), that D2R might use.
   * @note The file is either read from D2R game files as specified in D2RMM's config,
   *       or is the result of previously installed mods already operating on this file.
   * @example
   * ```
   * const profileHD = D2RMM.readJson('global\\ui\\layouts\\_profilehd.json');
   * profileHD.FontColorRed.r; // 252
   * ```
   * @param filePath - The path of the file to read, relative to the data directory.
   * @returns The parsed JSON data.
   */
  readJson: (filePath: string) => JSONData;

  /**
   * Writes a JSON D2R file.
   * @example
   * ```
   * // change red colored text to bright green!
   * const profileHD = D2RMM.readJson('global\\ui\\layouts\\_profilehd.json');
   * profileHD.FontColorRed = {r: 0, b: 0, g: 255, a: 255};
   * D2RMM.writeJson('global\\ui\\layouts\\_profilehd.json', profileHD);
   * ```
   * @param filePath - The path of the file to write, relative to the data directory.
   * @param data - The JSON data to write.
   */
  writeJson: (filePath: string, data: JSONData) => void;

  /**
   * Reads a TSV (tab separated values in a .txt) D2R file. This is a classic data format used by D2.
   * @note The last column in the file will probably have a `\r` at the end of its name.
   * @note The file is either read from D2R game files as specified in D2RMM's config,
   *       or is the result of previously installed mods already operating on this file.
   * @example
   * ```
   * const treasureclassex = D2RMM.readTsv('global\\excel\\treasureclassex.txt');
   * console.log('There are ' + treasureclassex.rows.length + ' treasure classes!');
   * console.log('Each treasure class has ' + treasureclassex.headers.length + ' properties!');
   * ```
   * @param filePath - The path of the file to read, relative to the data directory.
   * @returns The parsed TSV data.
   */
  readTsv: (filePath: string) => TSVData;

  /**
   * Writes a TSV (tab separated values in a .txt) D2R file. This is a classic data format used by D2.
   * @example
   * ```
   * const treasureclassex = D2RMM.readTsv('global\\excel\\treasureclassex.txt');
   * treasureclassex.rows.forEach(row => {
   *   // D2R TSV files sometimes have blank rows
   *   if (row['Treasure Class'] !== '') {
   *     row.NoDrop = 1;
   *   }
   * });
   * D2RMM.writeTsv('global\\excel\\treasureclassex.txt', treasureclassex);
   * ```
   * @param filePath - The path of the file to write, relative to the data directory.
   * @param data - The TSV data to write.
   */
  writeTsv: (filePath: string, data: TSVData) => void;

  /**
   * Reads a plain text D2R file.
   * @note The file is either read from D2R game files as specified in D2RMM's config,
   *       or is the result of previously installed mods already operating on this file.
   * @example
   * ```
   * const nextStringIDRaw = D2RMM.readJson('local\\next_string_id.txt');
   * let nextStringID = nextStringIDRaw.match(/[0-9]+/)[0]; // next valid string id
   * ```
   * @param filePath - The path of the file to read, relative to the data directory.
   * @returns The raw text data.
   */
  readTxt: (filePath: string) => string;

  /**
   * Writes a plain text D2R file.
   * @example
   * ```
   * const nextStringIDRaw = D2RMM.readTxt('local\\next_string_id.txt');
   * let nextStringID = nextStringIDRaw.match(/[0-9]+/)[0]; // next valid string id
   * nextStringID ++;
   * nextStringIDRaw.replace(/[0-9]+/, nextStringID);
   * D2RMM.writeTxt('local\\next_string_id.txt', nextStringIDRaw);
   * ```
   * @param filePath - The path of the file to write, relative to the data directory.
   * @param data - The raw text data to write.
   */
  writeTxt: (filePath: string, data: string) => void;

  /**
   * Reads a save file from the saves directory as a binary Buffer.
   * @example
   * ```
   * const stashData = D2RMM.readSaveFile('SharedStashSoftCoreV2.d2i');
   * console.log('Save file size: ' + stashData.length);
   * ```
   * @param filePath - The path of the save file to read, relative to the saves directory.
   * @returns The binary data of the save file.
   */
  readSaveFile: (filePath: string) => Buffer | null;

  /**
   * Writes a save file to the saves directory as a binary Buffer.
   * @note It's highly recommended to write a backup of any save file you are modifying
   *       because save files can be corrupted if written incorrectly.
   * @example
   * ```
   * const stashData = D2RMM.readSaveFile('SharedStashSoftCoreV2.d2i');
   * D2RMM.writeSaveFile('SharedStashSoftCoreV2.d2i', Buffer.concat([stashData, EXTRA_STASH_TAB]));
   * ```
   * @param filePath - The path of the save file to write, relative to the saves directory.
   * @param data - The binary data of the save file to write.
   */
  writeSaveFile: (filePath: string, data: Buffer) => void;

  /**
   * Copies a file or directory from the mod directory to the data directory. This
   * is primarily used for including non-mergeable assets like sprites in your mod.
   * @note While you can use this API to provide whole new versions of TSV/JSON game
   *       files to the game, this is an anti-pattern and will dramatically reduce your
   *       mod's compatibility with other mods. Don't do it. Use the `read*` and `write*`
   *       APIs instead.
   * @param src - The path of the file or directory to copy, relative to the mod directory.
   * @param dst - The path of the file or directory to copy to, relative to the data directory.
   * @param overwrite - Whether to overwrite any conflicts.
   * @example
   * ```
   * // copy new sprites to the output directory
   * D2RMM.copyFile(
   *   'hd', // <mod folder>\hd
   *   'hd', // <diablo 2 folder>\mods\D2RMM\D2RMM.mpq\data\hd
   *   true // overwrite any conflicts
   * );
   * ```
   */
  copyFile: (src: string, dst: string, overwrite?: boolean) => void;

  /**
   * Produces the next valid string ID to use as an identifier in D2R's data files.
   * The ID is read from `next_string_id.txt`, and then incremented within that file.
   * @returns The next valid string ID.
   */
  getNextStringID: () => number;

  /**
   * Shows an error message to the user.
   * @deprecated Use `console.error()` or `throw new Error()` instead.
   * @param message - The message to show.
   * @example
   * ```
   * D2RMM.error('Something went wrong!');
   * D2RMM.error(new Error('Something went wrong!'));
   * ```
   */
  error: (message: string | Error) => void;
}
