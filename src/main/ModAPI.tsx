import { JSONData } from 'renderer/JSON';
import { ModAPI } from 'renderer/ModAPI';
import { TSVData } from 'renderer/TSV';
import { FileManager } from './FileManager';
import { ConsoleAPI } from 'renderer/ConsoleAPI';

// keep in sync with api.ts
enum Relative {
  // files in the game folder will be accessed via fully resolved paths
  None = 'None',
  App = 'App',
  Saves = 'Saves',
}

let nextStringIDRaw: string | null = null;
let nextStringID: number = 0;

function throwIfError<T>(value: T | Error): T {
  if (value instanceof Error) {
    throw value;
  }
  return value;
}

export function getModAPI(
  BridgeAPI: BridgeAPIImplementation,
  mod: Mod,
  {
    dataPath,
    fileManager,
    gamePath,
    isDirectMode,
    isDryRun,
    isPreExtractedData,
    mergedPath,
    preExtractedDataPath,
    rendererConsole,
  }: IInstallModsOptions & {
    fileManager: FileManager;
    rendererConsole: ConsoleAPI;
  }
): ModAPI {
  function getPreExtractedSourceFilePath(filePath: string): string {
    return `${preExtractedDataPath}\\${filePath}`;
  }

  function getModSourceFilePath(filePath: string): string {
    const appPath = BridgeAPI.getAppPath();
    return `${appPath}\\mods\\${mod.id}\\${filePath}`;
  }

  function getDestinationFilePath(filePath: string): string {
    if (isDirectMode) {
      return `${dataPath}\\${filePath}`;
    }
    return `${mergedPath}\\${filePath}`;
  }

  function getRelativeFilePathFromDestinationFilePath(
    filePath: string
  ): string {
    if (isDirectMode) {
      return filePath.substring(dataPath.length + 1);
    }
    return filePath.substring(mergedPath.length + 1);
  }

  function extractFile(filePath: string): void {
    // if file is already exists (was creating during this installation), don't need to extract it again
    if (fileManager.exists(filePath)) {
      return;
    }

    // if we're using direct mode, then we want to delete any existing file
    // and extract it during the very first time we use it so that we're
    // always applying to clean vanilla data rather than the output of a
    // previous installation
    if (isDirectMode && !fileManager.exists(filePath)) {
      throwIfError(
        BridgeAPI.deleteFile(getDestinationFilePath(filePath), Relative.None)
      );
    }

    if (isPreExtractedData) {
      const success = throwIfError(
        BridgeAPI.copyFile(
          getPreExtractedSourceFilePath(filePath),
          getDestinationFilePath(filePath),
          false // don't overwrite if it already exists
        )
      );
      if (success === 2) {
        throw new Error(
          `file "${getPreExtractedSourceFilePath(filePath)}" was not found`
        );
      }
    } else {
      throwIfError(
        BridgeAPI.extractFile(
          gamePath,
          filePath,
          getDestinationFilePath(filePath)
        )
      );
    }
    fileManager.extract(filePath, mod.id);
  }

  return {
    getVersion: (): number => {
      console.debug('D2RMM.getVersion');
      return parseFloat(throwIfError(BridgeAPI.getVersion()));
    },
    error: (message: string | Error): void => {
      if (message instanceof Error) {
        throw message;
      }
      throw new Error(message);
    },
    readTsv: (filePath: string): TSVData => {
      console.debug('D2RMM.readTsv', filePath);
      extractFile(filePath);
      const result = throwIfError(
        BridgeAPI.readTsv(getDestinationFilePath(filePath))
      );
      fileManager.read(filePath, mod.id);
      return result;
    },
    writeTsv: (filePath: string, data: TSVData): void => {
      console.debug('D2RMM.writeTsv', filePath, data);
      if (!isDryRun) {
        throwIfError(
          BridgeAPI.writeTsv(getDestinationFilePath(filePath), data)
        );
        fileManager.write(filePath, mod.id);
      }
    },
    readJson: (filePath: string): JSONData => {
      console.debug('D2RMM.readJson', filePath);
      extractFile(filePath);
      const result = throwIfError(
        BridgeAPI.readJson(getDestinationFilePath(filePath))
      );
      fileManager.read(filePath, mod.id);
      return result;
    },
    writeJson: (filePath: string, data: JSONData): void => {
      console.debug('D2RMM.writeJson', filePath, data);
      if (!isDryRun) {
        throwIfError(
          BridgeAPI.writeJson(getDestinationFilePath(filePath), data)
        );
        fileManager.write(filePath, mod.id);
      }
    },
    copyFile: (src: string, dst: string, overwrite = false): void => {
      console.debug('D2RMM.copyFile', src, dst);
      if (!isDryRun) {
        const copiedFiles: CopiedFile[] = [];
        throwIfError(
          BridgeAPI.copyFile(
            getModSourceFilePath(src),
            getDestinationFilePath(dst),
            overwrite,
            copiedFiles
          )
        );
        copiedFiles.forEach(({ toPath }) => {
          fileManager.write(
            getRelativeFilePathFromDestinationFilePath(toPath),
            mod.id
          );
        });
      }
    },
    readTxt: (filePath: string): string => {
      console.debug('D2RMM.readTxt', filePath);
      extractFile(filePath);
      const result = throwIfError(
        BridgeAPI.readTxt(getDestinationFilePath(filePath))
      );
      fileManager.read(filePath, mod.id);
      return result;
    },
    writeTxt: (filePath: string, data: string): void => {
      console.debug('D2RMM.writeTxt', filePath, data);
      if (!isDryRun) {
        throwIfError(
          BridgeAPI.writeTxt(getDestinationFilePath(filePath), data)
        );
        fileManager.write(filePath, mod.id);
      }
    },
    readSaveFile: (filePath: string): Buffer | null => {
      console.debug('D2RMM.readSaveFile', filePath);
      const result = throwIfError(
        BridgeAPI.readBinaryFile(filePath, Relative.Saves)
      );
      fileManager.read(filePath, mod.id);
      return result;
    },
    writeSaveFile: (filePath: string, data: Buffer): void => {
      console.debug('D2RMM.writeSaveFile', filePath, data);
      if (!isDryRun) {
        throwIfError(BridgeAPI.writeBinaryFile(filePath, Relative.Saves, data));
        fileManager.write(filePath, mod.id);
      }
    },
    getNextStringID: (): number => {
      console.debug('D2RMM.getNextStringID');

      const filePath = 'local\\lng\\next_string_id.txt';

      if (nextStringIDRaw == null) {
        extractFile(filePath);
        nextStringIDRaw = throwIfError(
          BridgeAPI.readTxt(getDestinationFilePath(filePath))
        );
        nextStringID = parseInt(
          nextStringIDRaw?.match(/[0-9]+/)?.[0] ?? '0',
          10
        );
      }

      const stringID = nextStringID;
      nextStringID = nextStringID + 1;

      if (nextStringIDRaw != null) {
        if (!isDryRun) {
          throwIfError(
            BridgeAPI.writeTxt(
              getDestinationFilePath(filePath),
              nextStringIDRaw.replace(/[0-9]+/, String(nextStringID))
            )
          );
        }
      }

      return stringID;
    },
  };
}
