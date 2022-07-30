import { IPreferences } from './Preferences';
import { Toast } from './ToastContext';

const API = window.electron.API;

let nextStringIDRaw: string | null = null;
let nextStringID: number = 0;

export default function getModAPI(
  mod: Mod,
  { dataPath, gamePath, mergedPath, isDirectData }: IPreferences,
  showToast: (toast: Toast) => unknown
): ModAPI {
  function getLocalDataFilePath(filePath: string): string {
    return `${dataPath}\\${filePath}`;
  }

  function getModFilePath(filePath: string): string {
    return `${mod.id}\\${filePath}`;
  }

  function getMergedFilePath(filePath: string): string {
    return `${mergedPath}\\${filePath}`;
  }

  function extractFile(filePath: string): void {
    if (isDirectData) {
      API.copyFile(getLocalDataFilePath(filePath), getMergedFilePath(filePath));
    } else {
      API.extractFile(gamePath, filePath, getMergedFilePath(filePath));
    }
  }

  return {
    getVersion: (): number => {
      console.log('D2RMM.getVersion');
      return parseFloat(API.getVersion());
    },
    error: (message: string | Error): void => {
      console.error('D2RMM.error', mod.id, message);
      showToast({
        severity: 'error',
        title: `Mod ${mod.info.name ?? mod.id} encountered an error!`,
        description: typeof message === 'string' ? message : message.toString(),
      });
    },
    readTsv: (filePath: string): TSVData => {
      console.log('D2RMM.readTsv', filePath);
      extractFile(filePath);
      return API.readTsv(getMergedFilePath(filePath));
    },
    writeTsv: (filePath: string, data: TSVData): void => {
      console.log('D2RMM.writeTsv', filePath, data);
      API.writeTsv(getMergedFilePath(filePath), data);
    },
    readJson: (filePath: string): JSONData => {
      console.log('D2RMM.readJson', filePath);
      extractFile(filePath);
      return API.readJson(getMergedFilePath(filePath));
    },
    writeJson: (filePath: string, data: JSONData): void => {
      console.log('D2RMM.writeJson', filePath, data);
      API.writeJson(getMergedFilePath(filePath), data);
    },
    copyFile: (src: string, dst: string, overwrite = false): void => {
      console.log('D2RMM.copyFile', src, dst);
      API.copyFile(getModFilePath(src), getMergedFilePath(dst), overwrite);
    },
    readTxt: (filePath: string): string => {
      console.log('D2RMM.readTxt', filePath);
      extractFile(filePath);
      return API.readTxt(getMergedFilePath(filePath));
    },
    writeTxt: (filePath: string, data: string): void => {
      console.log('D2RMM.writeTxt', filePath, data);
      API.writeTxt(getMergedFilePath(filePath), data);
    },
    getNextStringID: (): number => {
      console.log('D2RMM.getNextStringID');

      const filePath = 'local\\lng\\next_string_id.txt';

      if (nextStringIDRaw == null) {
        extractFile(filePath);
        nextStringIDRaw = API.readTxt(getMergedFilePath(filePath));
        nextStringID = parseInt(
          nextStringIDRaw?.match(/[0-9]+/)?.[0] ?? '0',
          10
        );
      }

      const stringID = nextStringID;
      nextStringID = nextStringID + 1;

      if (nextStringIDRaw != null) {
        API.writeTxt(
          getMergedFilePath(filePath),
          nextStringIDRaw.replace(/[0-9]+/, String(nextStringID))
        );
      }

      return stringID;
    },
  };
}
