const API = window.electron.API;

export default function getModAPI(
  mod: Mod,
  { vanillaPath, mergedPath, modPath }: D2RMMPaths
): ModAPI {
  return {
    log: (message: string): void => {
      console.log('D2RMM.log', mod.id, message);
    },
    readTsv: (filePath: string): TSVData => {
      console.log('D2RMM.readTsv', filePath);
      const vanillaFilePath = vanillaPath + '\\' + filePath;
      const mergedFilePath = mergedPath + '\\' + filePath;
      API.copyFile(vanillaFilePath, mergedFilePath);
      return API.readTsv(mergedFilePath);
    },
    writeTsv: (filePath: string, data: TSVData): void => {
      console.log('D2RMM.writeTsv', filePath, data);
      const mergedFilePath = mergedPath + '\\' + filePath;
      API.writeTsv(mergedFilePath, data);
    },
    readJson: (filePath: string): JSONData => {
      console.log('D2RMM.readJson', filePath);
      const vanillaFilePath = vanillaPath + '\\' + filePath;
      const mergedFilePath = mergedPath + '\\' + filePath;
      API.copyFile(vanillaFilePath, mergedFilePath);
      return API.readJson(mergedFilePath);
    },
    writeJson: (filePath: string, data: JSONData): void => {
      console.log('D2RMM.writeJson', filePath, data);
      const mergedFilePath = mergedPath + '\\' + filePath;
      API.writeJson(mergedFilePath, data);
    },
    copyFile: (src: string, dst: string, overwrite: boolean = false): void => {
      console.log('D2RMM.copyFile', src, dst);
      const srcPath = modPath + '\\' + mod.id + '\\' + src;
      const dstPath = mergedPath + '\\' + dst;
      API.copyFile(srcPath, dstPath, overwrite);
    },
  };
}
