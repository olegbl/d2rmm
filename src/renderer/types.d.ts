import { JSONData, TSVData, Relative } from './ModAPITypes';
import { ModConfig, ModConfigValue } from './ModConfigTypes';
import { IReadOnlyPreferences } from './PreferenceTypes';

declare global {
  type ILogLevel = 'error' | 'warn' | 'log' | 'debug';

  type IInstallModsOptions = IReadOnlyPreferences & { isDryRun: boolean };

  type Mod = {
    id: string;
    info: ModConfig;
    config: ModConfigValue;
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
    closeStorage: () => boolean | Error;
    copyFile: (
      fromPath: string,
      toPath: string,
      overwrite?: boolean
    ) => number | Error;
    createDirectory: (filePath: string) => boolean | Error;
    deleteFile: (filePath: string, relative: Relative) => number | Error;
    execute: (
      executablePath: string,
      args?: string[],
      sync?: boolean
    ) => number | Error;
    extractFile: (
      gamePath: string,
      filePath: string,
      targetPath: string
    ) => boolean | Error;
    getAppPath: () => string;
    getGamePath: () => Promise<string | null>;
    getVersion: () => string;
    installMods: (
      modsToInstall: Mod[],
      options: IInstallModsOptions
    ) => string[];
    openStorage: (gamePath: string) => boolean | Error;
    readDirectory: (
      filePath: string
    ) => { name: string; isDirectory: boolean }[] | Error;
    readFile: (filePath: string, relative: Relative) => string | null | Error;
    readBinaryFile: (
      filePath: string,
      relative: Relative
    ) => Buffer | null | Error;
    readJson: (filePath: string) => JSONData | Error;
    readModCode: (id: string) => string | Error;
    readModConfig: (id: string) => JSON;
    readModDirectory: () => string[] | Error;
    readModInfo: (id: string) => ModConfig;
    readTsv: (filePath: string) => TSVData | Error;
    readTxt: (filePath: string) => string | Error;
    writeFile: (
      inputPath: string,
      relative: Relative,
      data: string
    ) => number | Error;
    writeBinaryFile: (
      inputPath: string,
      relative: Relative,
      data: Buffer
    ) => number | Error;
    writeJson: (filePath: string, data: JSONData) => number | Error;
    writeModConfig: (id: string, value: ModConfigValue) => number | Error;
    writeTsv: (filePath: string, data: TSVData) => number | Error;
    writeTxt: (filePath: string, data: string) => number | Error;
  };

  // errors get thrown
  // async methods are made synchronous
  type BridgeAPIDeriver<T> = {
    [K in keyof T]: T[K] extends (...args: infer A) => infer R
      ? (...args: A) => Exclude<R extends Promise<infer PR> ? PR : R, Error>
      : never;
  };

  type BridgeAPI = BridgeAPIDeriver<BridgeAPIImplementation>;

  interface Window {
    electron: {
      BridgeAPI: BridgeAPI;
      console: Console;
      RendererAPI: RendererAPI;
    };
  }
}

export {};
