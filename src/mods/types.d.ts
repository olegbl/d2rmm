import type { ConsoleAPI, ConsoleArg } from '../bridge/ConsoleAPI';
import type { JSONData } from '../bridge/JSON';
import type { ModAPI } from '../bridge/ModAPI';
import type {
  ModConfigValue,
  ModConfigSingleValue,
} from '../bridge/ModConfigValue';
import type { TSVData, TSVDataHeader, TSVDataRow } from '../bridge/TSV';

// the imports will be dropped during out build process
// since they cannot work in a published release setting

// the actual values *will* be available as they will be
// bundled by dts-bundle, but we need to rename them so
// that we can export them from the global module with
// their original name for convenience

type ImportedModConfigValue = ModConfigValue;
type ImportedModConfigSingleValue = ModConfigSingleValue;

type ImportedConsoleAPI = ConsoleAPI;
type ImportedConsoleArg = ConsoleArg;

type ImportedModAPI = ModAPI;
type ImportedJSONData = JSONData;
type ImportedTSVData = TSVData;
type ImportedTSVDataHeader = TSVDataHeader;
type ImportedTSVDataRow = TSVDataRow;

declare global {
  /**
   * The config for the mod, as set by the user, with default values filled in.
   */
  const config: ModConfigValue;
  type ModConfigValue = ImportedModConfigValue;
  type ModConfigSingleValue = ImportedModConfigSingleValue;

  /**
   * The global console object. It works similarly to the one provided by DOM or Node.
   */
  // @ts-ignore[2649]: overriding global console
  const console: ConsoleAPI;
  type ConsoleAPI = ImportedConsoleAPI;
  type ConsoleArg = ImportedConsoleArg;

  /**
   * The D2RMM API. Use this to interact with the game's files.
   */
  const D2RMM: ModAPI;
  type ModAPI = ImportedModAPI;
  type JSONData = ImportedJSONData;
  type TSVData = ImportedTSVData;
  type TSVDataHeader = ImportedTSVDataHeader;
  type TSVDataRow = ImportedTSVDataRow;
}
