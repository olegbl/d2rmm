declare global {
  type D2RMMPaths = {
    gamePath: string;
    mergedPath: string;
  };

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

  type ModAPI = {
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

  type ModInfo = {
    name: string;
    description?: string;
    author?: string;
    website?: string;
    version?: string;
    config?: readonly ModConfigField[];
  };

  type ModConfigFieldBase = {
    id: string;
    name: string;
    description: string;
  };

  type ModConfigFieldCheckbox = ModConfigFieldBase & {
    type: 'checkbox';
    defaultValue: boolean;
  };

  type ModConfigFieldNumber = ModConfigFieldBase & {
    type: 'number';
    defaultValue: number;
  };

  type ModConfigField = ModConfigFieldCheckbox | ModConfigFieldNumber;

  type WindowAPI = {
    copyFile: (fromPath: string, toPath: string, overwrite?: boolean) => void;
    createDirectory: (filePath: string) => void;
    deleteFile: (filePath: string) => void;
    extractFile: (
      gamePath: string,
      filePath: string,
      targetPath: string
    ) => void;
    openURL: (url: string) => void;
    readDirectory: (
      filePath: string
    ) => { name: string; isDirectory: boolean }[];
    readModDirectory: () => string[];
    readJson: (filePath: string) => JSONData;
    readModCode: (id: string) => string;
    readModConfig: (id: string) => JSON;
    readModInfo: (id: string) => ModInfo;
    readTsv: (filePath: string) => TSVData;
    runTool: (tool: string, params?: string[]) => void;
    writeJson: (filePath: string, data: JSONData) => void;
    writeModConfig: (id: string, value: ModConfigValue) => JSON;
    writeTsv: (filePath: string, data: TSVData) => void;
  };

  interface Window {
    electron: {
      API: WindowAPI;
    };
  }
}

export {};
