import type { CopiedFile } from 'bridge/BridgeAPI';
import type { AsyncModAPI } from 'bridge/ModAPI';
import { InstallationRuntime } from './InstallationRuntime';

let nextStringIDRaw: string | null = null;
let nextStringID: number = 0;

export function getModAPI(runtime: InstallationRuntime): AsyncModAPI {
  async function tryExtractFile(filePath: string): Promise<void> {
    // if file is already exists (was creating during this installation), don't need to extract it again
    if (runtime.fileManager.exists(filePath)) {
      return;
    }

    // if we're using direct mode, then we want to delete any existing file
    // and extract it during the very first time we use it so that we're
    // always applying to clean vanilla data rather than the output of a
    // previous installation
    if (runtime.options.isDirectMode) {
      await runtime.BridgeAPI.deleteFile(
        runtime.getDestinationFilePath(filePath),
        'None',
      );
    }

    try {
      if (runtime.options.isPreExtractedData) {
        const success = await runtime.BridgeAPI.copyFile(
          runtime.getPreExtractedSourceFilePath(filePath),
          runtime.getDestinationFilePath(filePath),
          false, // don't overwrite if it already exists
        );
        if (success === 2) {
          throw new Error(
            `file "${runtime.getPreExtractedSourceFilePath(
              filePath,
            )}" was not found`,
          );
        }
      } else {
        await runtime.BridgeAPI.extractFile(
          filePath,
          runtime.getDestinationFilePath(filePath),
        );
      }
      await runtime.fileManager.extract(filePath, runtime.mod.id);
    } catch (e) {
      // if we failed to extract the file, that's okay, it may not be a vanilla file
    }
  }

  return {
    getConfigJSON: async () => {
      console.debug('D2RMM.getConfigJSON');
      return JSON.stringify(runtime.mod.config);
    },
    getVersion: async () => {
      console.debug('D2RMM.getVersion');
      const [major, minor] = await runtime.BridgeAPI.getVersion();
      return parseFloat(`${major}.${minor}`);
    },
    getFullVersion: async () => {
      console.debug('D2RMM.getFullVersion');
      return await runtime.BridgeAPI.getVersion();
    },
    getModList: async () => {
      console.debug('D2RMM.getModList');
      return runtime.modsToInstall.map((mod) => ({
        id: mod.id,
        name: mod.info.name,
        version: mod.info.version,
        installed: runtime.modsInstalled.includes(mod.id),
        config: mod.config,
      }));
    },
    error: async (message) => {
      if (message instanceof Error) {
        throw message;
      }
      throw new Error(message);
    },
    readTsv: async (filePath) => {
      console.debug('D2RMM.readTsv', filePath);
      await tryExtractFile(filePath);
      const result = await runtime.BridgeAPI.readTsv(
        runtime.getDestinationFilePath(filePath),
      );
      await runtime.fileManager.read(filePath, runtime.mod.id);
      return result;
    },
    writeTsv: async (filePath, data) => {
      console.debug('D2RMM.writeTsv', filePath);
      if (!runtime.options.isDryRun) {
        await runtime.BridgeAPI.writeTsv(
          runtime.getDestinationFilePath(filePath),
          data,
        );
        await runtime.fileManager.write(filePath, runtime.mod.id);
      }
    },
    readJson: async (filePath) => {
      console.debug('D2RMM.readJson', filePath);
      await tryExtractFile(filePath);
      const result = await runtime.BridgeAPI.readJson(
        runtime.getDestinationFilePath(filePath),
      );
      await runtime.fileManager.read(filePath, runtime.mod.id);
      return result;
    },
    writeJson: async (filePath, data) => {
      console.debug('D2RMM.writeJson', filePath);
      if (!runtime.options.isDryRun) {
        await runtime.BridgeAPI.writeJson(
          runtime.getDestinationFilePath(filePath),
          data,
        );
        await runtime.fileManager.write(filePath, runtime.mod.id);
      }
    },
    copyFile: async (src, dst, overwrite = false) => {
      console.debug('D2RMM.copyFile', src, dst);
      if (!runtime.options.isDryRun) {
        const copiedFiles: CopiedFile[] = [];
        await runtime.BridgeAPI.copyFile(
          await runtime.getModSourceFilePath(src),
          runtime.getDestinationFilePath(dst),
          overwrite,
          copiedFiles,
        );
        for (const { toPath } of copiedFiles) {
          await runtime.fileManager.write(
            runtime.getRelativeFilePathFromDestinationFilePath(toPath),
            runtime.mod.id,
          );
        }
      }
    },
    readTxt: async (filePath) => {
      console.debug('D2RMM.readTxt', filePath);
      await tryExtractFile(filePath);
      const result = await runtime.BridgeAPI.readTxt(
        runtime.getDestinationFilePath(filePath),
      );
      await runtime.fileManager.read(filePath, runtime.mod.id);
      return result;
    },
    writeTxt: async (filePath, data) => {
      console.debug('D2RMM.writeTxt', filePath);
      if (!runtime.options.isDryRun) {
        await runtime.BridgeAPI.writeTxt(
          runtime.getDestinationFilePath(filePath),
          data,
        );
        await runtime.fileManager.write(filePath, runtime.mod.id);
      }
    },
    readSaveFile: async (filePath) => {
      console.debug('D2RMM.readSaveFile', filePath);
      const result = await runtime.BridgeAPI.readBinaryFile(filePath, 'Saves');
      await runtime.fileManager.read(filePath, runtime.mod.id);
      return result;
    },
    writeSaveFile: async (filePath, data) => {
      console.debug('D2RMM.writeSaveFile', filePath);
      if (!runtime.options.isDryRun) {
        await runtime.BridgeAPI.writeBinaryFile(filePath, 'Saves', data);
        await runtime.fileManager.write(filePath, runtime.mod.id);
      }
    },
    getNextStringID: async () => {
      console.debug('D2RMM.getNextStringID');

      const filePath = path.resolve('local', 'lng', 'next_string_id.txt');

      if (nextStringIDRaw == null) {
        await tryExtractFile(filePath);
        nextStringIDRaw = await runtime.BridgeAPI.readTxt(
          runtime.getDestinationFilePath(filePath),
        );
        nextStringID = parseInt(
          nextStringIDRaw?.match(/[0-9]+/)?.[0] ?? '0',
          10,
        );
      }
      await runtime.fileManager.read(filePath, runtime.mod.id);

      const stringID = nextStringID;
      nextStringID = nextStringID + 1;

      if (nextStringIDRaw != null) {
        if (!runtime.options.isDryRun) {
          await runtime.BridgeAPI.writeTxt(
            runtime.getDestinationFilePath(filePath),
            nextStringIDRaw.replace(/[0-9]+/, String(nextStringID)),
          );
        }
      }

      await runtime.fileManager.write(filePath, runtime.mod.id);

      return stringID;
    },
  };
}
