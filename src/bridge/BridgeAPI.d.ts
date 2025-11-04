import type { JSONData } from './JSON';
import type { ModConfig } from './ModConfig';
import type { ModConfigValue } from './ModConfigValue';
import type { Relative } from './Relative';
import type { TSVData } from './TSV';

export type IInstallModsOptions = {
  dataPath: string;
  gamePath: string;
  isDirectMode: boolean;
  isDryRun: boolean;
  isPreExtractedData: boolean;
  mergedPath: string;
  outputModName: string;
  preExtractedDataPath: string;
  savesPath: string;
};

export type Mod = {
  id: string;
  info: ModConfig;
  config: ModConfigValue;
};

export type CopiedFile = {
  fromPath: string;
  toPath: string;
};

export type IBridgeAPI = {
  closeStorage: () => Promise<boolean>;
  copyFile: (
    fromPath: string,
    toPath: string,
    overwrite?: boolean,
    isDryRun?: boolean,
    outCopiedFiles?: CopiedFile[],
  ) => Promise<number>;
  createDirectory: (filePath: string) => Promise<boolean>;
  deleteFile: (filePath: string, relative: Relative) => Promise<number>;
  execute: (
    executablePath: string,
    args?: string[],
    sync?: boolean,
  ) => Promise<number>;
  isGameFile: (filePath: string) => Promise<boolean>;
  extractFile: (filePath: string, targetPath: string) => Promise<boolean>;
  getAppPath: () => Promise<string>;
  getGamePath: () => Promise<string | null>;
  getVersion: () => Promise<[number, number, number]>;
  installMods: (
    modsToInstall: Mod[],
    options: IInstallModsOptions,
  ) => Promise<string[]>;
  openStorage: (gamePath: string) => Promise<boolean>;
  readDirectory: (
    filePath: string,
  ) => Promise<{ name: string; isDirectory: boolean }[]>;
  readFile: (filePath: string, relative: Relative) => Promise<string | null>;
  readBinaryFile: (
    filePath: string,
    relative: Relative,
  ) => Promise<number[] | null>;
  readJson: (filePath: string) => Promise<JSONData>;
  readModCode: (id: string) => Promise<[string, string]>;
  readModConfig: (id: string) => Promise<JSONData>;
  readModDirectory: () => Promise<string[]>;
  readModInfo: (id: string) => Promise<ModConfig>;
  readTsv: (filePath: string) => Promise<TSVData>;
  readTxt: (filePath: string) => Promise<string>;
  writeFile: (
    inputPath: string,
    relative: Relative,
    data: string,
  ) => Promise<number>;
  writeBinaryFile: (
    inputPath: string,
    relative: Relative,
    data: number[],
  ) => Promise<number>;
  writeJson: (filePath: string, data: JSONData) => Promise<number>;
  writeModConfig: (id: string, value: ModConfigValue) => Promise<number>;
  writeTsv: (filePath: string, data: TSVData) => Promise<number>;
  writeTxt: (filePath: string, data: string) => Promise<number>;
};
