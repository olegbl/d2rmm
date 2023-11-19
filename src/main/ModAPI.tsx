import { JSONData, ModAPI, TSVData } from 'renderer/ModAPITypes';

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
    preExtractedDataPath,
    gamePath,
    isDirectMode,
    isPreExtractedData,
    mergedPath,
    extractedFiles,
    isDryRun,
  }: IInstallModsOptions & {
    extractedFiles: Record<string, boolean>;
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

  function extractFile(filePath: string): void {
    // if we're using direct mode, then we want to delete any existing file
    // and extract it during the very first time we use it so that we're
    // always applying to clean vanilla data rather than the output of a
    // previous installation
    if (isDirectMode && !extractedFiles[filePath]) {
      throwIfError(
        BridgeAPI.deleteFile(getDestinationFilePath(filePath), false)
      );
    }
    extractedFiles[filePath] = true;

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
      return throwIfError(BridgeAPI.readTsv(getDestinationFilePath(filePath)));
    },
    writeTsv: (filePath: string, data: TSVData): void => {
      console.debug('D2RMM.writeTsv', filePath, data);
      if (!isDryRun) {
        throwIfError(
          BridgeAPI.writeTsv(getDestinationFilePath(filePath), data)
        );
      }
    },
    readJson: (filePath: string): JSONData => {
      console.debug('D2RMM.readJson', filePath);
      extractFile(filePath);
      return throwIfError(BridgeAPI.readJson(getDestinationFilePath(filePath)));
    },
    writeJson: (filePath: string, data: JSONData): void => {
      console.debug('D2RMM.writeJson', filePath, data);
      if (!isDryRun) {
        throwIfError(
          BridgeAPI.writeJson(getDestinationFilePath(filePath), data)
        );
      }
    },
    copyFile: (src: string, dst: string, overwrite = false): void => {
      console.debug('D2RMM.copyFile', src, dst);
      if (!isDryRun) {
        throwIfError(
          BridgeAPI.copyFile(
            getModSourceFilePath(src),
            getDestinationFilePath(dst),
            overwrite
          )
        );
      }
    },
    readTxt: (filePath: string): string => {
      console.debug('D2RMM.readTxt', filePath);
      extractFile(filePath);
      return throwIfError(BridgeAPI.readTxt(getDestinationFilePath(filePath)));
    },
    writeTxt: (filePath: string, data: string): void => {
      console.debug('D2RMM.writeTxt', filePath, data);
      if (!isDryRun) {
        throwIfError(
          BridgeAPI.writeTxt(getDestinationFilePath(filePath), data)
        );
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
