import { IPreferences } from './Preferences';
import { Toast } from './ToastContext';

const API = window.electron.API;

let nextStringIDRaw: string | null = null;
let nextStringID: number = 0;

export default function getModAPI(
  mod: Mod,
  {
    dataPath,
    preExtractedDataPath,
    gamePath,
    isDirectMode,
    isDryRun,
    isPreExtractedData,
    mergedPath,
  }: IPreferences,
  extractedFiles: Record<string, boolean>,
  showToast: (toast: Toast) => unknown
): ModAPI {
  function getPreExtractedSourceFilePath(filePath: string): string {
    return `${preExtractedDataPath}\\${filePath}`;
  }

  function getModSourceFilePath(filePath: string): string {
    const appPath = API.getAppPath();
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
      API.deleteFile(getDestinationFilePath(filePath));
    }
    extractedFiles[filePath] = true;

    if (isPreExtractedData) {
      const success = API.copyFile(
        getPreExtractedSourceFilePath(filePath),
        getDestinationFilePath(filePath),
        false // don't overwrite if it already exists
      );
      if (success === 2) {
        throw new Error(
          `file "${getPreExtractedSourceFilePath(filePath)}" was not found`
        );
      }
    } else {
      API.extractFile(gamePath, filePath, getDestinationFilePath(filePath));
    }
  }

  return {
    getVersion: (): number => {
      console.log('D2RMM.getVersion');
      return parseFloat(API.getVersion());
    },
    error: (message: string | Error): void => {
      console.error('D2RMM.error', mod.id, message);
      let trace = '';
      if (typeof message !== 'string') {
        const match = (message.stack ?? '').match(
          /<anonymous>:([0-9]+):([0-9]+)/
        );
        if (match != null) {
          const line = parseInt(match[1], 10) - 2; // we prefix the source with two extra lines
          const column = parseInt(match[2], 10);
          trace = ` at ${line}:${column}`;
        }
      }
      showToast({
        severity: 'error',
        title: `Mod ${mod.info.name ?? mod.id} encountered a runtime error!`,
        description:
          typeof message === 'string' ? message : message.toString() + trace,
      });
    },
    readTsv: (filePath: string): TSVData => {
      console.log('D2RMM.readTsv', filePath);
      extractFile(filePath);
      return API.readTsv(getDestinationFilePath(filePath));
    },
    writeTsv: (filePath: string, data: TSVData): void => {
      console.log('D2RMM.writeTsv', filePath, data);
      if (!isDryRun) {
        API.writeTsv(getDestinationFilePath(filePath), data);
      }
    },
    readJson: (filePath: string): JSONData => {
      console.log('D2RMM.readJson', filePath);
      extractFile(filePath);
      return API.readJson(getDestinationFilePath(filePath));
    },
    writeJson: (filePath: string, data: JSONData): void => {
      console.log('D2RMM.writeJson', filePath, data);
      if (!isDryRun) {
        API.writeJson(getDestinationFilePath(filePath), data);
      }
    },
    copyFile: (src: string, dst: string, overwrite = false): void => {
      console.log('D2RMM.copyFile', src, dst);
      API.copyFile(
        getModSourceFilePath(src),
        getDestinationFilePath(dst),
        overwrite
      );
    },
    readTxt: (filePath: string): string => {
      console.log('D2RMM.readTxt', filePath);
      extractFile(filePath);
      return API.readTxt(getDestinationFilePath(filePath));
    },
    writeTxt: (filePath: string, data: string): void => {
      console.log('D2RMM.writeTxt', filePath, data);
      if (!isDryRun) {
        API.writeTxt(getDestinationFilePath(filePath), data);
      }
    },
    getNextStringID: (): number => {
      console.log('D2RMM.getNextStringID');

      const filePath = 'local\\lng\\next_string_id.txt';

      if (nextStringIDRaw == null) {
        extractFile(filePath);
        nextStringIDRaw = API.readTxt(getDestinationFilePath(filePath));
        nextStringID = parseInt(
          nextStringIDRaw?.match(/[0-9]+/)?.[0] ?? '0',
          10
        );
      }

      const stringID = nextStringID;
      nextStringID = nextStringID + 1;

      if (nextStringIDRaw != null) {
        if (!isDryRun) {
          API.writeTxt(
            getDestinationFilePath(filePath),
            nextStringIDRaw.replace(/[0-9]+/, String(nextStringID))
          );
        }
      }

      return stringID;
    },
  };
}
