import type { AsyncModAPI } from 'bridge/ModAPI';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { readCString } from './CascLib';
import { InstallationRuntime } from './InstallationRuntime';
import { encodeJson, parseJson } from './JSONParser';
import { encodeTsv, parseTsv } from './TSVParser';

let nextStringIDRaw: string | null = null;
let nextStringID: number = 0;

export function resetNextStringIDState(): void {
  nextStringIDRaw = null;
  nextStringID = 0;
}

export function getModAPI(runtime: InstallationRuntime): AsyncModAPI {
  async function tryExtractFile(filePath: string): Promise<void> {
    // if file already exists in memory (was extracted or created during this installation),
    // don't need to extract it again
    if (runtime.fileManager.exists(filePath)) {
      return;
    }

    try {
      let buffer: Buffer;
      if (runtime.options.isPreExtractedData) {
        // read from pre-extracted source into memory
        const result = await runtime.BridgeAPI.readFile(
          filePath,
          'PreExtractedData',
        );
        if (result == null) {
          throw new Error(`file "${filePath}" was not found`);
        }
        buffer = result;
      } else {
        // extract from CASC into memory
        buffer = await runtime.BridgeAPI.extractFileToMemory(filePath);
      }
      runtime.fileManager.setData(filePath, buffer);
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
      filePath = processPathForPlatform(filePath);
      console.debug('D2RMM.readTsv', filePath);
      await tryExtractFile(filePath);
      const buffer = runtime.fileManager.getData(filePath);
      if (buffer == null) {
        throw new Error(`File "${filePath}" not found`);
      }
      const result = parseTsv(readCString(buffer));
      await runtime.fileManager.read(filePath, runtime.mod.id);
      return result;
    },
    writeTsv: async (filePath, data) => {
      filePath = processPathForPlatform(filePath);
      console.debug('D2RMM.writeTsv', filePath);
      const textData = encodeTsv(data);
      runtime.fileManager.setData(filePath, Buffer.from(textData, 'utf-8'));
      await runtime.fileManager.write(filePath, runtime.mod.id);
    },
    readJson: async (filePath) => {
      filePath = processPathForPlatform(filePath);
      console.debug('D2RMM.readJson', filePath);
      await tryExtractFile(filePath);
      const buffer = runtime.fileManager.getData(filePath);
      if (buffer == null) {
        throw new Error(`File "${filePath}" not found`);
      }
      const result = parseJson(readCString(buffer));
      await runtime.fileManager.read(filePath, runtime.mod.id);
      return result;
    },
    writeJson: async (filePath, data) => {
      filePath = processPathForPlatform(filePath);
      console.debug('D2RMM.writeJson', filePath);
      const textData = encodeJson(data);
      runtime.fileManager.setData(filePath, Buffer.from(textData, 'utf-8'));
      await runtime.fileManager.write(filePath, runtime.mod.id);
    },
    copyFile: async (src, dst, overwrite = false) => {
      src = processPathForPlatform(src);
      dst = processPathForPlatform(dst);
      console.debug('D2RMM.copyFile', src, dst);
      const appPath = await runtime.BridgeAPI.getAppPath();
      const modPath = path.resolve(appPath, 'mods', runtime.mod.id);
      const srcPath = path.resolve(modPath, src);
      if (!path.resolve(srcPath).startsWith(path.resolve(modPath))) {
        throw new Error(
          `Path "${srcPath}" points outside of allowed directory "${modPath}".`,
        );
      }
      const copiedRelativePaths = await copySourceFilesToMemory(
        runtime,
        srcPath,
        dst,
        overwrite,
      );
      for (const relativePath of copiedRelativePaths) {
        await runtime.fileManager.write(relativePath, runtime.mod.id);
      }
    },
    readTxt: async (filePath) => {
      filePath = processPathForPlatform(filePath);
      console.debug('D2RMM.readTxt', filePath);
      await tryExtractFile(filePath);
      const buffer = runtime.fileManager.getData(filePath);
      await runtime.fileManager.read(filePath, runtime.mod.id);
      if (buffer == null) {
        return '';
      }
      return readCString(buffer);
    },
    writeTxt: async (filePath, data) => {
      filePath = processPathForPlatform(filePath);
      console.debug('D2RMM.writeTxt', filePath);
      runtime.fileManager.setData(filePath, Buffer.from(data, 'utf-8'));
      await runtime.fileManager.write(filePath, runtime.mod.id);
    },
    readSaveFile: async (filePath) => {
      filePath = processPathForPlatform(filePath);
      console.debug('D2RMM.readSaveFile', filePath);
      const result = await runtime.BridgeAPI.readBinaryFile(filePath, 'Saves');
      await runtime.fileManager.read(filePath, runtime.mod.id);
      return result;
    },
    writeSaveFile: async (filePath, data) => {
      filePath = processPathForPlatform(filePath);
      console.debug('D2RMM.writeSaveFile', filePath);
      if (!runtime.options.isDryRun) {
        await runtime.BridgeAPI.writeBinaryFile(filePath, 'Saves', data);
        await runtime.fileManager.write(filePath, runtime.mod.id);
      }
    },
    getNextStringID: async () => {
      console.debug('D2RMM.getNextStringID');
      const filePath = processPathForPlatform(
        path.join('local', 'lng', 'next_string_id.txt'),
      );
      if (nextStringIDRaw == null) {
        await tryExtractFile(filePath);
        const buffer = runtime.fileManager.getData(filePath);
        nextStringIDRaw = buffer != null ? readCString(buffer) : '';
        nextStringID = parseInt(
          nextStringIDRaw?.match(/[0-9]+/)?.[0] ?? '0',
          10,
        );
      }
      await runtime.fileManager.read(filePath, runtime.mod.id);

      const stringID = nextStringID;
      nextStringID = nextStringID + 1;

      if (nextStringIDRaw != null) {
        const updatedText = nextStringIDRaw.replace(
          /[0-9]+/,
          String(nextStringID),
        );
        runtime.fileManager.setData(
          filePath,
          Buffer.from(updatedText, 'utf-8'),
        );
        await runtime.fileManager.write(filePath, runtime.mod.id);
      }

      return stringID;
    },
  };
}

async function copySourceFilesToMemory(
  runtime: InstallationRuntime,
  srcPath: string,
  dstRelative: string,
  overwrite: boolean,
): Promise<string[]> {
  const result: string[] = [];

  if (!existsSync(srcPath)) {
    return result;
  }

  const stat = statSync(srcPath);
  if (stat.isDirectory()) {
    const entries = readdirSync(srcPath, { withFileTypes: true });
    for (const entry of entries) {
      const childSrc = path.join(srcPath, entry.name);
      const childDst = path.join(dstRelative, entry.name);
      if (entry.isDirectory()) {
        const subResult = await copySourceFilesToMemory(
          runtime,
          childSrc,
          childDst,
          overwrite,
        );
        result.push(...subResult);
      } else {
        if (!overwrite && runtime.fileManager.exists(childDst)) {
          continue;
        }
        const buffer = readFileSync(childSrc);
        runtime.fileManager.setData(childDst, buffer);
        result.push(childDst);
      }
    }
  } else {
    if (!overwrite && runtime.fileManager.exists(dstRelative)) {
      return result;
    }
    const buffer = readFileSync(srcPath);
    runtime.fileManager.setData(dstRelative, buffer);
    result.push(dstRelative);
  }

  return result;
}

function processPathForPlatform(filePath: string): string {
  return process.platform !== 'win32' ? filePath.replace(/\\/g, '/') : filePath;
}
