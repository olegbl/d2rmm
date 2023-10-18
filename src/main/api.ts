import { BrowserWindow, app, ipcMain } from 'electron';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'fs';
import path from 'path';
import ffi from 'ffi-napi';
import ref from 'ref-napi';
import { execFile, execFileSync } from 'child_process';
// vm2 isn't secure, but isolated-vm refuses to build for this version of electron
// going to table updating to isolated-vm for later as I've wasted too much time already
// @ts-ignore[2307] - no @types/vm2 exists
import { VM } from 'vm2';
import json5 from 'json5';
import packageManifest from '../../release/app/package.json';
import { getModAPI } from './ModAPI';

function notNull<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}

const rendererConsole = {
  debug: (..._args: unknown[]): void => {},
  log: (..._args: unknown[]): void => {},
  warn: (..._args: unknown[]): void => {},
  error: (..._args: unknown[]): void => {},
};

export function getAppPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, '../')
    : path.join(__dirname, '../../');
}

function copyDirSync(src: string, dest: string) {
  mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true });
  entries.forEach((entry) => {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  });
}

const voidPtr = ref.refType(ref.types.void);
const voidPtrPtr = ref.refType(voidPtr);
const dwordPtr = ref.refType(ref.types.uint32);

// http://www.zezula.net/en/casc/casclib.html
const CascLib = ffi.Library(path.join(getAppPath(), 'tools', 'CascLib.dll'), {
  CascCloseFile: ['bool', [voidPtr]],
  CascCloseStorage: ['bool', [voidPtr]],
  CascOpenFile: ['bool', [voidPtr, 'string', 'int', 'int', voidPtrPtr]],
  CascOpenStorage: ['bool', ['string', 'int', voidPtrPtr]],
  CascReadFile: ['bool', [voidPtr, voidPtr, 'int', dwordPtr]],
  GetLastError: ['int', []],
});

// CascLib Error Codes for GetLastError()
const KnownCastLibErrorCodes: { [code: number]: string } = {
  0: 'ERROR_SUCCESS',
  2: 'ERROR_PATH_NOT_FOUND',
  1: 'ERROR_ACCESS_DENIED',
  9: 'ERROR_INVALID_HANDLE',
  12: 'ERROR_NOT_ENOUGH_MEMORY',
  45: 'ERROR_NOT_SUPPORTED',
  22: 'ERROR_INVALID_PARAMETER',
  28: 'ERROR_DISK_FULL',
  17: 'ERROR_ALREADY_EXISTS',
  55: 'ERROR_INSUFFICIENT_BUFFER',
  1000: 'ERROR_BAD_FORMAT',
  1001: 'ERROR_NO_MORE_FILES',
  1002: 'ERROR_HANDLE_EOF',
  1003: 'ERROR_CAN_NOT_COMPLETE',
  1004: 'ERROR_FILE_CORRUPT',
  1005: 'ERROR_FILE_ENCRYPTED',
  1006: 'ERROR_FILE_TOO_LARGE',
  1007: 'ERROR_ARITHMETIC_OVERFLOW',
  1008: 'ERROR_NETWORK_NOT_AVAILABLE',
};

function processErrorCode(errorCodeArg: string | number): string {
  let errorCode = errorCodeArg;
  if (typeof errorCode === 'string') {
    errorCode = parseInt(errorCode, 10);
  }
  return KnownCastLibErrorCodes[errorCode];
}

function createError(
  method: string,
  message: string,
  errorCodeArg?: unknown
): Error {
  const prefix = `${method}: ${message}`;
  let errorCode = errorCodeArg;
  if (errorCode != null) {
    if (typeof errorCode === 'string' || typeof errorCode === 'number') {
      errorCode = processErrorCode(errorCode) ?? errorCode;
    }
    return new Error(`${prefix}: ${String(errorCode)}`);
  }
  return new Error(prefix);
}

// TODO: use CascFindFirstFile & CascFindNextFile to implement an "extractFiles" API
//       that would recursively extract all files in a directory
// e.g. https://github.com/ladislav-zezula/CascLib/blob/4fc4c18bd5a49208337199a7f4256271675cae44/test/CascTest.cpp#L816

const cascStoragePtr = ref.alloc(voidPtrPtr);
let cascStorageIsOpen = false;

export const BridgeAPI: BridgeAPIImplementation = {
  getVersion: () => {
    rendererConsole.debug('BridgeAPI.getVersion');

    return packageManifest.version;
  },

  getAppPath: () => {
    rendererConsole.debug('BridgeAPI.getAppPath');

    return getAppPath();
  },

  execute: (
    executablePath: string,
    args: string[] = [],
    sync: boolean = false
  ) => {
    rendererConsole.debug('BridgeAPI.execute', { executablePath, args, sync });

    try {
      if (sync) {
        execFileSync(executablePath, args ?? []);
      } else {
        execFile(executablePath, args ?? []);
      }
      return 0;
    } catch (error) {
      return createError('BridgeAPI.execute', 'Failed to execute file', error);
    }
  },

  openStorage: (gamePath: string) => {
    rendererConsole.debug('BridgeAPI.openStorage', { gamePath });

    if (!cascStorageIsOpen) {
      if (CascLib.CascOpenStorage(`${gamePath}:osi`, 0, cascStoragePtr)) {
        cascStorageIsOpen = true;
      } else if (CascLib.CascOpenStorage(`${gamePath}:`, 0, cascStoragePtr)) {
        cascStorageIsOpen = true;
      } else {
        return createError(
          'API.openStorage',
          'Failed to open CASC storage',
          `(CascLib Error Code: ${CascLib.GetLastError()})`
        );
      }
    }

    return cascStorageIsOpen;
  },

  closeStorage: () => {
    rendererConsole.debug('BridgeAPI.closeStorage');

    if (cascStorageIsOpen) {
      const storage = cascStoragePtr.deref();
      if (CascLib.CascCloseStorage(storage)) {
        cascStorageIsOpen = false;
      } else {
        return createError(
          'API.closeStorage',
          'Failed to close CASC storage',
          `(CascLib Error Code: ${CascLib.GetLastError()})`
        );
      }
    }

    return !cascStorageIsOpen;
  },

  extractFile: (gamePath: string, filePath: string, targetPath: string) => {
    rendererConsole.debug('BridgeAPI.extractFile', {
      gamePath,
      filePath,
      targetPath,
    });

    try {
      // if file is already extracted, don't need to extract it again
      if (existsSync(targetPath)) {
        return true;
      }

      if (!cascStorageIsOpen) {
        return createError('BridgeAPI.extractFile', 'CASC storage is not open');
      }

      const storage = cascStoragePtr.deref();

      const filePtr = ref.alloc(voidPtrPtr);
      if (
        !CascLib.CascOpenFile(storage, `data:data\\${filePath}`, 0, 0, filePtr)
      ) {
        return createError(
          'API.extractFile',
          `Failed to open file in CASC storage (${filePath})`,
          `(CascLib Error Code: ${CascLib.GetLastError()})`
        );
      }

      const file = filePtr.deref();
      const bytesReadPtr = ref.alloc(dwordPtr);

      // if the file is larger than 10 MB... I got bad news for you.
      const size = 10 * 1024 * 1024;
      const buffer = Buffer.alloc(size) as ref.Pointer<void>;
      buffer.type = ref.types.void;

      if (CascLib.CascReadFile(file, buffer, size, bytesReadPtr)) {
        const data = buffer.readCString();
        mkdirSync(path.dirname(targetPath), { recursive: true });
        writeFileSync(targetPath, data, {
          encoding: 'utf-8',
          flag: 'w',
        });
      } else {
        return createError(
          'API.extractFile',
          `Failed to read file in CASC storage (${filePath})`,
          `(CascLib Error Code: ${CascLib.GetLastError()})`
        );
      }

      if (!CascLib.CascCloseFile(file)) {
        return createError(
          'API.extractFile',
          `Failed to close file in CASC storage (${filePath})`,
          `(CascLib Error Code: ${CascLib.GetLastError()})`
        );
      }
    } catch (e) {
      return createError(
        'API.extractFile',
        'Failed to extract file',
        String(e)
      );
    }

    return true;
  },

  createDirectory: (filePath: string) => {
    rendererConsole.debug('BridgeAPI.createDirectory', { filePath });

    try {
      if (!existsSync(filePath)) {
        mkdirSync(filePath, { recursive: true });
        return true;
      }
    } catch (e) {
      return createError(
        'API.createDirectory',
        'Failed to create directory',
        String(e)
      );
    }

    return false;
  },

  readDirectory: (filePath: string) => {
    rendererConsole.debug('BridgeAPI.readDirectory', { filePath });

    try {
      if (existsSync(filePath)) {
        const entries = readdirSync(filePath, { withFileTypes: true });
        return entries.map((entry) => ({
          name: entry.name,
          isDirectory: entry.isDirectory(),
        }));
      }
      return [];
    } catch (e) {
      return createError(
        'API.readDirectory',
        'Failed to read directory',
        String(e)
      );
    }
  },

  readModDirectory: () => {
    rendererConsole.debug('BridgeAPI.readModDirectory');

    try {
      const filePath = path.join(getAppPath(), 'mods');
      if (existsSync(filePath)) {
        const entries = readdirSync(filePath, { withFileTypes: true });
        return entries
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name);
      }
      return [];
    } catch (e) {
      return createError(
        'API.readModDirectory',
        'Failed to read directory',
        String(e)
      );
    }
  },

  readFile: (inputPath: string, isRelative: boolean) => {
    rendererConsole.debug('BridgeAPI.readFile', { inputPath, isRelative });

    const filePath = isRelative
      ? path.join(getAppPath(), inputPath)
      : inputPath;

    try {
      if (existsSync(filePath)) {
        const result = readFileSync(filePath, {
          encoding: 'utf-8',
          flag: 'r',
        });
        return result;
      }
    } catch (e) {
      return createError(
        'BridgeAPI.readFile',
        'Failed to read file',
        String(e)
      );
    }

    return null;
  },

  writeFile: (inputPath: string, isRelative: boolean, data: string) => {
    rendererConsole.debug('BridgeAPI.writeFile', { inputPath, isRelative });

    const filePath = isRelative
      ? path.join(getAppPath(), inputPath)
      : inputPath;

    try {
      writeFileSync(filePath, data, {
        encoding: 'utf-8',
        flag: 'w',
      });
    } catch (e) {
      return createError(
        'BridgeAPI.writeFile',
        'Failed to write file',
        String(e)
      );
    }

    return 0;
  },

  deleteFile: (inputPath: string, isRelative: boolean) => {
    rendererConsole.debug('BridgeAPI.deleteFile', { inputPath, isRelative });

    const filePath = isRelative
      ? path.join(getAppPath(), inputPath)
      : inputPath;

    try {
      if (existsSync(filePath)) {
        const stat = statSync(filePath);
        if (stat.isDirectory()) {
          rmSync(filePath, { recursive: true, force: true });
        } else {
          rmSync(filePath, { force: true });
        }
        // file deleted successfully
        return 0;
      }
    } catch (e) {
      return createError(
        'BridgeAPI.deleteFile',
        'Failed to delete file',
        String(e)
      );
    }

    // file doesn't exist
    return 1;
  },

  copyFile: (fromPath: string, toPath: string, overwrite: boolean = false) => {
    rendererConsole.debug('BridgeAPI.copyFile', {
      fromPath,
      toPath,
      overwrite,
    });

    try {
      if (!existsSync(fromPath)) {
        // source file doesn't exist
        return 2;
      }

      if (existsSync(toPath) && !overwrite) {
        // destination file already exists
        return 1;
      }

      const stat = statSync(fromPath);
      if (stat.isDirectory()) {
        copyDirSync(fromPath, toPath);
      } else {
        mkdirSync(path.dirname(toPath), { recursive: true });
        copyFileSync(fromPath, toPath);
      }
    } catch (e) {
      return createError(
        'BridgeAPI.copyFile',
        'Failed to copy file',
        String(e)
      );
    }

    // file copied successfully
    return 0;
  },

  readModInfo: (id: string) => {
    rendererConsole.debug('BridgeAPI.readModInfo', {
      id,
    });

    const filePath = `mods\\${id}\\mod.json`;
    const result = BridgeAPI.readFile(filePath, true);

    if (result instanceof Error) {
      return result;
    }

    if (result != null) {
      return {
        name: id,
        ...JSON.parse(result),
      };
    }

    return null;
  },

  readModConfig: (id: string) => {
    rendererConsole.debug('BridgeAPI.readModConfig', {
      id,
    });

    const filePath = `mods\\${id}\\config.json`;
    const result = BridgeAPI.readFile(filePath, true);

    if (result instanceof Error) {
      return result;
    }

    if (result != null) {
      return JSON.parse(result);
    }

    return null;
  },

  writeModConfig: (id: string, value: ModConfigValue) => {
    rendererConsole.debug('BridgeAPI.writeModConfig', {
      id,
      value,
    });

    const filePath = `mods\\${id}\\config.json`;
    return BridgeAPI.writeFile(filePath, true, JSON.stringify(value));
  },

  readModCode: (id: string) => {
    rendererConsole.debug('BridgeAPI.readModCode', {
      id,
    });

    const filePath = `mods\\${id}\\mod.js`;
    return BridgeAPI.readFile(filePath, true);
  },

  readTsv: (filePath: string) => {
    rendererConsole.debug('BridgeAPI.readTsv', {
      filePath,
    });

    const result = BridgeAPI.readFile(filePath, false);

    if (result instanceof Error) {
      return result;
    }

    if (result == null) {
      return { headers: [], rows: [] };
    }

    const [headersRaw, ...rowsRaw] = result.split('\n');
    const headers = headersRaw.split('\t');
    const rows: TSVDataRow[] = rowsRaw
      .map((row) => {
        if (row === '') {
          return null;
        }
        const rowRaw = row.split('\t');
        return rowRaw.reduce((agg, value, index) => {
          agg[headers[index]] = value;
          return agg;
        }, {} as TSVDataRow);
      })
      .filter(notNull);
    return { headers, rows };
  },

  writeTsv: (filePath, data) => {
    rendererConsole.debug('BridgeAPI.writeTsv', {
      filePath,
      data,
    });

    const { headers, rows } = data;
    const headersRaw = headers.join('\t');
    const rowsRaw = rows.map((row) =>
      headers.map((header) => row[header] ?? '').join('\t')
    );
    const content = [headersRaw, ...rowsRaw, ''].join('\n');
    return BridgeAPI.writeFile(filePath, false, content);
  },

  readJson: (filePath) => {
    rendererConsole.debug('BridgeAPI.readJson', { filePath });

    const result = BridgeAPI.readFile(filePath, false);

    if (result instanceof Error) {
      return result;
    }

    if (result == null) {
      rendererConsole.warn('BridgeAPI.readJson', 'file not found');
      return {};
    }

    const cleanContent = result
      // remove byte order mark
      .replace(/^\uFEFF/, '');
    try {
      return json5.parse(cleanContent);
    } catch (e) {
      return e instanceof Error ? e : new Error(String(e));
    }
  },

  writeJson: (filePath, data) => {
    rendererConsole.debug('BridgeAPI.writeJson', { filePath, data });

    const content = JSON.stringify(data); // we don't use json5 here so that keys are still wrapped in quotes
    const result = BridgeAPI.writeFile(
      filePath,
      false,
      // add byte order mark (not every vanilla file has one but D2R doesn't seem to mind when it's added)
      `\uFEFF${content}`
    );

    if (result instanceof Error) {
      rendererConsole.error('BridgeAPI.writeJson', result);
      return result;
    }

    return result;
  },

  readTxt: (filePath) => {
    rendererConsole.debug('BridgeAPI.readTxt', { filePath });

    const result = BridgeAPI.readFile(filePath, false);

    if (result instanceof Error) {
      rendererConsole.error('BridgeAPI.readTxt', result);
      return result;
    }

    if (result == null) {
      rendererConsole.warn('BridgeAPI.readTxt', 'file not found');
      return '';
    }

    return result;
  },

  writeTxt: (filePath, data) => {
    rendererConsole.debug('BridgeAPI.writeTxt', { filePath, data });

    const result = BridgeAPI.writeFile(filePath, false, data);

    if (result instanceof Error) {
      rendererConsole.error('BridgeAPI.writeTxt', result);
      return result;
    }

    return result;
  },

  installMods: (modsToInstall: Mod[], options: IInstallModsOptions) => {
    const { gamePath, mergedPath, isPreExtractedData, isDirectMode, isDryRun } =
      options;
    const action = isDryRun ? 'Uninstall' : 'Install';

    if (!isDirectMode) {
      BridgeAPI.deleteFile(`${mergedPath}\\..`, false);
      BridgeAPI.createDirectory(mergedPath);
      BridgeAPI.writeJson(`${mergedPath}\\..\\modinfo.json`, {
        name: 'D2RMM',
        savepath: 'D2RMM/',
      });
    }

    if (!isPreExtractedData) {
      BridgeAPI.openStorage(gamePath);
    }

    const extractedFiles: Record<string, boolean> = {};

    const modsInstalled = [];
    for (let i = 0; i < modsToInstall.length; i = i + 1) {
      const mod = modsToInstall[i];
      try {
        rendererConsole.debug(`Mod ${mod.info.name} parsing code...`);
        const result = BridgeAPI.readModCode(mod.id);
        if (result instanceof Error) {
          throw result;
        }
        if (result == null) {
          throw new Error('Could not read code from mod.js.');
        }
        const code: string = `(function(){\n${result}\n})()`;
        const api = getModAPI(BridgeAPI, mod, {
          ...options,
          extractedFiles,
        });
        rendererConsole.debug(
          `Mod ${mod.info.name} ${action.toLowerCase()}ing...`
        );
        const vm = new VM({
          sandbox: {
            config: mod.config,
            console: rendererConsole,
            D2RMM: api,
          },
          timeout: 30000,
          wasm: false, // Disable WebAssembly support if not required
          eval: false, // Disable eval function if not required
        });
        vm.run(code);
        modsInstalled.push(mod.id);
        rendererConsole.log(
          `Mod ${mod.info.name} ${action.toLowerCase()}ed successfully.`
        );
      } catch (error) {
        if (error instanceof Error) {
          const message = (error.stack ?? '')
            .replace(
              /:([0-9]+):([0-9]+)/g,
              // decrement all line numbers by 1 to account for the wrapper function
              (_match, line, column) => `:${Number(line) - 1}:${column}`
            )
            .split('\n')
            .filter((line, index) => index === 0 || line.includes('vm.js:'))
            .join('\n')
            .replace(/vm.js:/g, 'mod.js:')
            .slice(0, -1);
          rendererConsole.error(
            `Mod ${mod.info.name} encountered an error!\n${message}`
          );
        }
      }
    }

    if (!isPreExtractedData) {
      BridgeAPI.closeStorage();
    }

    return modsInstalled;
  },
};

export function initBridgeAPI(mainWindow: BrowserWindow): void {
  // hook up bridge API calls
  Object.keys(BridgeAPI).forEach((apiName) => {
    const apiCall = BridgeAPI[apiName as keyof typeof BridgeAPI];
    ipcMain.on(apiName, (event, args: unknown[] | void) => {
      // @ts-ignore[2556] - can't enforce strict typing for data coming across the bridge
      event.returnValue = apiCall(...(args ?? []));
    });
  });

  // forward console messages to the renderer process
  const consoleMethods = ['debug', 'log', 'warn', 'error'] as const;
  consoleMethods.forEach((level: typeof consoleMethods[number]) => {
    rendererConsole[level] = (...args) => {
      mainWindow.webContents.send('console', [level, args]);
    };
  });
}
