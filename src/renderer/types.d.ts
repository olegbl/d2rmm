declare global {
  type ILogLevel = 'error' | 'warn' | 'log' | 'debug';

  type IReadOnlyPreferences = {
    dataPath: string;
    extraArgs: string[];
    gamePath: string;
    isDirectMode: boolean;
    isPreExtractedData: boolean;
    mergedPath: string;
    outputModName: string;
    preExtractedDataPath: string;
    rawGamePath: string;
  };

  type IPreferences = IReadOnlyPreferences & {
    setExtraArgs: (value: string[]) => void;
    setIsDirectMode: (value: boolean) => void;
    setIsPreExtractedData: (value: boolean) => void;
    setOutputModName: (value: string) => void;
    setPreExtractedDataPath: (value: string) => void;
    setRawGamePath: (value: string) => void;
  };

  type IInstallModsOptions = IReadOnlyPreferences & { isDryRun: boolean };

  type TSVDataHeader = string;

  type TSVDataRow = {
    [header: TSVDataHeader]: string;
  };

  type TSVData = {
    headers: TSVDataHeader[];
    rows: TSVDataRow[];
  };

  type JSONDataValue = string | number | boolean;

  type JSONDataValues = JSONDataValue | JSONDataValue[];

  type JSONData = { [key: string]: JSONDataValues | JSONData };

  // this is the structure of the "D2RMM" global variable provided to mods' "mod.js" file
  type ModAPI = {
    // returns the version of D2RMM
    getVersion: () => number;

    // reads a JSON D2R file (ignoring comments, whitespace, and various mistakes in JSON formatting that D2R makes)
    // the file is the result of previously installed mods operating on it
    // or is ripped directly from D2R game files if no preceding mod has needed it yet
    // e.g.:
    // const profileHD = D2RMM.readJson('global\\ui\\layouts\\_profilehd.json');
    // profileHD.FontColorRed.r; // 252
    readJson: (filePath: string) => JSONData;

    // writes a JSON D2R file to the data directory
    // e.g.:
    // // change red colored text to bright green!
    // const profileHD = D2RMM.readJson('global\\ui\\layouts\\_profilehd.json');
    // profileHD.FontColorRed = {r: 0, b: 0, g: 255, a: 255};
    // D2RMM.writeJson('global\\ui\\layouts\\_profilehd.json', profileHD);
    writeJson: (filePath: string, data: JSONData) => void;

    // reads a TSV D2R file and parses it in JSON format where you can access columns by name instead of index
    // the file is the result of previously installed mods operating on it
    // or is ripped directly from D2R game files if no preceding mod has needed it yet
    // e.g.:
    // const treasureclassex = D2RMM.readTsv('global\\excel\\treasureclassex.txt');
    // console.log('There are ' + treasureclassex.rows.length + ' treasure classes!');
    // console.log('Each treasure class has ' + treasureclassex.headers.length + ' properties!');
    readTsv: (filePath: string) => TSVData;

    // writes a TSV D2R file to the data directory
    // e.g.:
    // const treasureclassex = D2RMM.readTsv('global\\excel\\treasureclassex.txt');
    // treasureclassex.rows.forEach(row => {
    //   // D2R TSV files sometimes have blank rows
    //   if (row['Treasure Class'] !== '') {
    //     row.NoDrop = 1;
    //   }
    // });
    // D2RMM.writeTsv('global\\excel\\treasureclassex.txt', treasureclassex);
    writeTsv: (filePath: string, data: TSVData) => void;

    // reads a D2R file as plain text
    // the file is the result of previously installed mods operating on it
    // or is ripped directly from D2R game files if no preceding mod has needed it yet
    // e.g.:
    // const nextStringIDRaw = D2RMM.readJson('local\\next_string_id.txt');
    // let nextStringID = nextStringIDRaw.match(/[0-9]+/)[0]; // next valid string id
    readTxt: (filePath: string) => string;

    // writes a D2R file as plain text to the data directory
    // e.g.:
    // const nextStringIDRaw = D2RMM.readTxt('local\\next_string_id.txt');
    // let nextStringID = nextStringIDRaw.match(/[0-9]+/)[0]; // next valid string id
    // nextStringID ++;
    // nextStringIDRaw.replace(/[0-9]+/, nextStringID);
    // D2RMM.writeTxt('local\\next_string_id.txt', nextStringIDRaw);
    writeTxt: (filePath: string, data: string) => void;

    // copies a file or directory from the mod directory to the data directory
    // you should use this for non-mergeable assets like sprites
    // avoid using it for TSV and JSON data (but I'm not the police, you do you)
    // e.g.:
    // D2RMM.copyFile(
    //   'hd', // <mod folder>\hd
    //   'hd', // <diablo 2 folder>\mods\D2RMM\D2RMM.mpq\data\hd
    //   true // overwrite any conflicts
    // );
    copyFile: (src: string, dst: string, overwrite?: boolean) => void;

    // returns the next valid string ID from "next_string_id.txt"
    // and incremenets the id inside the file
    getNextStringID: () => number;

    // shows an error message to the user (you probably don't need to do this manually, just throw the error)
    // e.g.:
    // D2RMM.error('Something went wrong!');
    // D2RMM.error(new Error('Something went wrong!'));
    error: (message: string | Error) => void;
  };

  type Mod = {
    id: string;
    info: ModInfo;
    config: ModConfigValue;
  };

  type ModConfigSingleValue = string | number | boolean | string[] | number[];

  type ModConfigValue = {
    [key: string]: ModConfigSingleValue;
  };

  // this is the structure of the "mod.json" file that mods should provide
  type ModInfo = {
    name: string;
    description?: string;
    author?: string;
    website?: string;
    version?: string;
    config?: readonly ModConfigFieldOrSection[];
  };

  type ModConfigFieldOrSection = ModConfigFieldSection | ModConfigField;

  type ModConfigFieldSection = {
    type: 'section';
    id: string;
    name: string;
    defaultExpanded?: boolean;
  };

  type ModConfigField =
    | ModConfigFieldCheckbox
    | ModConfigFieldNumber
    | ModConfigFieldText
    | ModConfigFieldSelect;

  type ModConfigFieldCheckbox = ModConfigFieldBase & {
    type: 'checkbox';
    defaultValue: boolean;
  };

  type ModConfigFieldNumber = ModConfigFieldBase & {
    type: 'number';
    defaultValue: number;
    minValue?: number;
    maxValue?: number;
  };

  type ModConfigFieldText = ModConfigFieldBase & {
    type: 'text';
    defaultValue: number;
  };

  type ModConfigFieldSelect = ModConfigFieldBase & {
    type: 'select';
    defaultValue: string;
    options: {
      description?: string;
      label: string;
      value: ModConfigSingleValue;
    }[];
  };

  type ModConfigFieldBase = {
    id: string;
    name: string;
    description: string;
  };

  type RendererAPI = {
    addConsoleListener: (
      listener: (level: ILogLevel, args: unknown[]) => void
    ) => void;
    openURL: (url: string) => void;
    removeConsoleListener: (
      listener: (level: ILogLevel, args: unknown[]) => void
    ) => void;
  };

  type BridgeAPIImplementation = {
    closeStorage: () => void;
    copyFile: (
      fromPath: string,
      toPath: string,
      overwrite?: boolean
    ) => number | Error;
    createDirectory: (filePath: string) => void;
    deleteFile: (filePath: string, isRelative: boolean) => number | Error;
    execute: (
      executablePath: string,
      args?: string[],
      sync?: boolean
    ) => number | Error;
    extractFile: (
      gamePath: string,
      filePath: string,
      targetPath: string
    ) => void;
    getAppPath: () => string;
    getVersion: () => string;
    installMods: (
      modsToInstall: Mod[],
      options: IInstallModsOptions
    ) => string[];
    openStorage: (gamePath: string) => void;
    readDirectory: (
      filePath: string
    ) => { name: string; isDirectory: boolean }[] | Error;
    readFile: (filePath: string, isRelative: boolean) => string | null | Error;
    readJson: (filePath: string) => JSONData | Error;
    readModCode: (id: string) => string | null | Error;
    readModConfig: (id: string) => JSON;
    readModDirectory: () => string[] | Error;
    readModInfo: (id: string) => ModInfo;
    readTsv: (filePath: string) => TSVData | Error;
    readTxt: (filePath: string) => string | Error;
    writeFile: (
      inputPath: string,
      isRelative: boolean,
      data: string
    ) => number | Error;
    writeJson: (filePath: string, data: JSONData) => void;
    writeModConfig: (id: string, value: ModConfigValue) => number | Error;
    writeTsv: (filePath: string, data: TSVData) => void;
    writeTxt: (filePath: string, data: string) => void;
  };

  type APIWithThrownErrors<T> = {
    [K in keyof T]: T[K] extends (...args: infer A) => infer R
      ? (...args: A) => Exclude<R, Error>
      : never;
  };

  type BridgeAPI = APIWithThrownErrors<BridgeAPIImplementation>;

  interface Window {
    electron: {
      BridgeAPI: BridgeAPI;
      console: Console;
      RendererAPI: RendererAPI;
    };
  }
}

export {};
