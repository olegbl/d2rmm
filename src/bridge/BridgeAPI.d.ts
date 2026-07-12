import type { JSONData } from './JSON';
import type { ModConfig } from './ModConfig';
import type { ModConfigValue } from './ModConfigValue';
import type { Relative } from './Relative';
import type { TSVData } from './TSV';
import type { ID2S, IStash } from './third-party/d2s/d2/types';

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

export type LutrisGame = {
  id: number;
  slug: string;
  name: string;
  runner: string | null;
  exe: string | null;
  prefix: string | null;
};

export type SteamGame = {
  gamePath: string;
  prefixPath: string;
};

export type SteamD2RDetection = {
  isSteamInstalled: boolean;
  installs: SteamGame[];
};

export type LinuxBinaryInstallStatus = {
  symlinkPath: string;
  targetPath: string;
  isInstalled: boolean;
  isInPath: boolean;
};

export type LinuxShortcutStatus = {
  isDesktopInstalled: boolean;
  isApplicationsInstalled: boolean;
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
  execute: (executablePath: string, args?: string[]) => Promise<number>;
  executeCommand: (command: string) => Promise<number>;
  isGameRunning: () => Promise<boolean>;
  isLutrisInstalled: () => Promise<boolean>;
  listLutrisGames: () => Promise<LutrisGame[]>;
  detectSteamD2RInstall: () => Promise<SteamD2RDetection>;
  getLinuxBinaryInstallStatus: () => Promise<LinuxBinaryInstallStatus>;
  toggleLinuxBinary: () => Promise<LinuxBinaryInstallStatus>;
  getLinuxShortcutStatus: () => Promise<LinuxShortcutStatus>;
  toggleLinuxDesktopShortcut: () => Promise<LinuxShortcutStatus>;
  toggleLinuxApplicationsShortcut: () => Promise<LinuxShortcutStatus>;
  isGameFile: (filePath: string) => Promise<boolean>;
  extractFileToMemory: (filePath: string) => Promise<Buffer>;
  getAppPath: () => Promise<string>;
  getGamePath: () => Promise<string | null>;
  getVersion: () => Promise<[number, number, number]>;
  readD2SData: (options: IInstallModsOptions) => Promise<{
    characters: { [fileName: string]: ID2S };
    stashes: { [fileName: string]: IStash };
    gameFiles: { [filePath: string]: TSVData | JSONData | string };
  }>;
  writeSaveFile: (
    options: IInstallModsOptions,
    fileName: string,
    data: ID2S | IStash,
  ) => Promise<number>;
  installMods: (
    modsToInstall: Mod[],
    options: IInstallModsOptions,
  ) => Promise<string[]>;
  openStorage: (gamePath: string, forceOnline?: boolean) => Promise<boolean>;
  readDirectory: (
    filePath: string,
  ) => Promise<{ name: string; isDirectory: boolean }[]>;
  readFile: (filePath: string, relative: Relative) => Promise<Buffer | null>;
  readTextFile: (
    filePath: string,
    relative: Relative,
  ) => Promise<string | null>;
  readBinaryFile: (
    filePath: string,
    relative: Relative,
  ) => Promise<number[] | null>;
  readJson: (filePath: string, relative: Relative) => Promise<JSONData>;
  readModCode: (id: string) => Promise<[string, string]>;
  readModConfig: (id: string) => Promise<JSONData>;
  readModDirectory: () => Promise<string[]>;
  readModInfo: (id: string) => Promise<ModConfig>;
  readTsv: (filePath: string, relative: Relative) => Promise<TSVData>;
  readTxt: (filePath: string, relative: Relative) => Promise<string>;
  writeFile: (
    inputPath: string,
    relative: Relative,
    data: Buffer,
  ) => Promise<number>;
  writeTextFile: (
    inputPath: string,
    relative: Relative,
    data: string,
  ) => Promise<number>;
  writeBinaryFile: (
    inputPath: string,
    relative: Relative,
    data: number[],
  ) => Promise<number>;
  writeJson: (
    filePath: string,
    relative: Relative,
    data: JSONData,
  ) => Promise<number>;
  writeModConfig: (id: string, value: ModConfigValue) => Promise<number>;
  writeTsv: (
    filePath: string,
    relative: Relative,
    data: TSVData,
  ) => Promise<number>;
  writeTxt: (
    filePath: string,
    relative: Relative,
    data: string,
  ) => Promise<number>;
};
