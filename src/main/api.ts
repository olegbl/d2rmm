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

import packageManifest from '../../release/app/package.json';

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
  rendererConsole.error('API.execute', method, message, errorCodeArg);

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

export const BridgeAPI = {
  getVersion: () => {
    rendererConsole.debug('BridgeAPI.getVersion');
    return packageManifest.version;
  },

  getAppPath: () => {
    rendererConsole.debug('BridgeAPI.getAppPath');
    return getAppPath();
  },

  execute: (executablePath: string, args: string[], sync: boolean) => {
    rendererConsole.debug('BridgeAPI.execute', { executablePath, args, sync });
    try {
      if (sync) {
        execFileSync(executablePath, args ?? []);
      } else {
        execFile(executablePath, args ?? []);
      }
      return true;
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
          CascLib.GetLastError()
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
          CascLib.GetLastError()
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
          'Failed to open CASC file',
          CascLib.GetLastError()
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
          'Failed to read CASC file',
          CascLib.GetLastError()
        );
      }

      if (!CascLib.CascCloseFile(file)) {
        return createError(
          'API.extractFile',
          'Failed to close CASC file',
          CascLib.GetLastError()
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
    } catch (e) {
      return createError(
        'API.readDirectory',
        'Failed to read directory',
        String(e)
      );
    }

    return null;
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
    } catch (e) {
      return createError(
        'API.readModDirectory',
        'Failed to read directory',
        String(e)
      );
    }

    return null;
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

    return true;
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
        return true;
      }
    } catch (e) {
      return createError(
        'BridgeAPI.deleteFile',
        'Failed to delete file',
        String(e)
      );
    }

    return false;
  },

  copyFile: (fromPath: string, toPath: string, overwrite: boolean) => {
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
