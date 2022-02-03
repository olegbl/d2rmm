declare global {
  type D2RMMPaths = {
    gamePath: string;
    vanillaPath: string;
    mergedPath: string;
    modPath: string;
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
    copyFile: (src: string, dst: string) => void;
    error: (message: string | Error) => void;
    readDirectory: (
      filePath: string,
      options: { directoriesOnly?: boolean; filesOnly?: boolean }
    ) => string[];
    readJson: (filePath: string) => JSONData;
    readTsv: (filePath: string) => TSVData;
    writeJson: (filePath: string, data: JSONData) => void;
    writeTsv: (filePath: string, data: TSVData) => void;
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
    readDirectory: (
      filePath: string,
      options: { directoriesOnly?: boolean; filesOnly?: boolean }
    ) => string[];
    readJson: (filePath: string) => JSONData;
    readModCode: (modPath: string, id: string) => string;
    readModConfig: (modPath: string, id: string) => JSON;
    readModInfo: (modPath: string, id: string) => ModInfo;
    readTsv: (filePath: string) => TSVData;
    writeJson: (filePath: string, data: JSONData) => void;
    writeModConfig: (
      modPath: string,
      id: string,
      value: ModConfigValue
    ) => JSON;
    writeTsv: (filePath: string, data: TSVData) => void;
  };

  interface Window {
    electron: {
      API: WindowAPI;
    };
  }
}

export {};
