import { Toast } from './ToastContext';

const API = window.electron.API;

let nextStringIDRaw: string | null = null;
let nextStringID: number = 0;

export default function getModAPI(
  mod: Mod,
  { gamePath, mergedPath }: D2RMMPaths,
  showToast: (toast: Toast) => unknown
): ModAPI {
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
      const mergedFilePath = `${mergedPath}\\${filePath}`;
      API.extractFile(gamePath, filePath, mergedFilePath);
      return API.readTsv(mergedFilePath);
    },
    writeTsv: (filePath: string, data: TSVData): void => {
      console.log('D2RMM.writeTsv', filePath, data);
      const mergedFilePath = `${mergedPath}\\${filePath}`;
      API.writeTsv(mergedFilePath, data);
    },
    readJson: (filePath: string): JSONData => {
      console.log('D2RMM.readJson', filePath);
      const mergedFilePath = `${mergedPath}\\${filePath}`;
      API.extractFile(gamePath, filePath, mergedFilePath);
      return API.readJson(mergedFilePath);
    },
    writeJson: (filePath: string, data: JSONData): void => {
      console.log('D2RMM.writeJson', filePath, data);
      const mergedFilePath = `${mergedPath}\\${filePath}`;
      API.writeJson(mergedFilePath, data);
    },
    copyFile: (src: string, dst: string, overwrite = false): void => {
      console.log('D2RMM.copyFile', src, dst);
      const srcPath = `${mod.id}\\${src}`;
      const dstPath = `${mergedPath}\\${dst}`;
      API.copyFile(srcPath, dstPath, overwrite);
    },
    readTxt: (filePath: string): string => {
      console.log('D2RMM.readTxt', filePath);
      const mergedFilePath = `${mergedPath}\\${filePath}`;
      API.extractFile(gamePath, filePath, mergedFilePath);
      return API.readTxt(mergedFilePath);
    },
    writeTxt: (filePath: string, data: string): void => {
      console.log('D2RMM.writeTxt', filePath, data);
      const mergedFilePath = `${mergedPath}\\${filePath}`;
      API.writeTxt(mergedFilePath, data);
    },
    getNextStringID: (): number => {
      console.log('D2RMM.getNextStringID');

      const filePath = 'local\\lng\\next_string_id.txt';
      const mergedFilePath = `${mergedPath}\\${filePath}`;

      if (nextStringIDRaw == null) {
        API.extractFile(gamePath, filePath, mergedFilePath);
        nextStringIDRaw = API.readTxt(mergedFilePath);
        nextStringID = parseInt(
          nextStringIDRaw?.match(/[0-9]+/)?.[0] ?? '0',
          10
        );
      }

      const stringID = nextStringID;
      nextStringID = nextStringID + 1;

      if (nextStringIDRaw != null) {
        API.writeTxt(
          mergedFilePath,
          nextStringIDRaw.replace(/[0-9]+/, String(nextStringID))
        );
      }

      return stringID;
    },
  };
}
