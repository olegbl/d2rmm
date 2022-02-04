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
    copyFile: (src: string, dst: string) => void;
    error: (message: string | Error) => void;
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
