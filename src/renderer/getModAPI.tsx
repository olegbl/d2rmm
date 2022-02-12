import { Toast } from './ToastContext';

const API = window.electron.API;

export default function getModAPI(
  mod: Mod,
  { gamePath, mergedPath }: D2RMMPaths,
  showToast: (toast: Toast) => unknown
): ModAPI {
  return {
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
  };
}
