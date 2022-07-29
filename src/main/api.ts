import { app, ipcMain } from 'electron';
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
import { execFileSync } from 'child_process';

import packageManifest from '../../release/app/package.json';

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
  console.error('API.execute', method, message, errorCodeArg);

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

export function createAPI(): void {
  ipcMain.on('getVersion', (event) => {
    console.log('API.getVersion');
    event.returnValue = packageManifest.version;
  });

  ipcMain.on('execute', (event, [executablePath, args]) => {
    console.log('API.execute', [executablePath, args]);
    try {
      execFileSync(executablePath, args ?? []);
      event.returnValue = true;
    } catch (error) {
      event.returnValue = createError(
        'API.execute',
        'Failed to execute file',
        error
      );
    }
  });

  ipcMain.on('openStorage', (event, gamePath) => {
    console.log('API.openStorage', gamePath);

    if (!cascStorageIsOpen) {
      if (CascLib.CascOpenStorage(`${gamePath}:osi`, 0, cascStoragePtr)) {
        cascStorageIsOpen = true;
      } else {
        event.returnValue = createError(
          'API.openStorage',
          'Failed to open CASC storage',
          CascLib.GetLastError()
        );
        return;
      }
    }

    event.returnValue = cascStorageIsOpen;
  });

  ipcMain.on('closeStorage', (event) => {
    console.log('API.closeStorage');

    if (cascStorageIsOpen) {
      const storage = cascStoragePtr.deref();
      if (CascLib.CascCloseStorage(storage)) {
        cascStorageIsOpen = false;
      } else {
        event.returnValue = createError(
          'API.closeStorage',
          'Failed to close CASC storage',
          CascLib.GetLastError()
        );
        return;
      }
    }

    event.returnValue = !cascStorageIsOpen;
  });

  ipcMain.on('extractFile', (event, [gamePath, filePath, targetPath]) => {
    console.log('API.extractFile', [gamePath, filePath, targetPath]);

    try {
      // if file is already extracted, don't need to extract it again
      if (existsSync(targetPath)) {
        event.returnValue = true;
        return;
      }

      if (!cascStorageIsOpen) {
        event.returnValue = createError(
          'API.extractFile',
          'CASC storage is not open'
        );
        return;
      }

      const storage = cascStoragePtr.deref();

      const filePtr = ref.alloc(voidPtrPtr);
      if (
        CascLib.CascOpenFile(storage, `data:data\\${filePath}`, 0, 0, filePtr)
      ) {
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
          event.returnValue = true;
        } else {
          event.returnValue = createError(
            'API.extractFile',
            'Failed to read CASC file',
            CascLib.GetLastError()
          );
          return;
        }

        if (!CascLib.CascCloseFile(file)) {
          event.returnValue = createError(
            'API.extractFile',
            'Failed to close CASC file',
            CascLib.GetLastError()
          );
          return;
        }
      } else {
        event.returnValue = createError(
          'API.extractFile',
          'Failed to open CASC file',
          CascLib.GetLastError()
        );
        return;
      }
    } catch (e) {
      event.returnValue = createError(
        'API.extractFile',
        'Failed to extract file',
        String(e)
      );
    }
  });

  ipcMain.on('createDirectory', (event, filePath) => {
    console.log('API.createDirectory', filePath);

    try {
      if (!existsSync(filePath)) {
        mkdirSync(filePath, { recursive: true });
        event.returnValue = true;
      } else {
        event.returnValue = false;
      }
    } catch (e) {
      event.returnValue = createError(
        'API.createDirectory',
        'Failed to create directory',
        CascLib.GetLastError()
      );
    }
  });

  ipcMain.on('readDirectory', (event, filePath) => {
    console.log('API.readDirectory', filePath);

    try {
      if (existsSync(filePath)) {
        const entries = readdirSync(filePath, { withFileTypes: true });
        event.returnValue = entries.map((entry) => ({
          name: entry.name,
          isDirectory: entry.isDirectory(),
        }));
      } else {
        event.returnValue = null;
      }
    } catch (e) {
      event.returnValue = createError(
        'API.readDirectory',
        'Failed to read directory',
        String(e)
      );
    }
  });

  ipcMain.on('readModDirectory', (event) => {
    console.log('API.readModDirectory');

    try {
      const filePath = path.join(getAppPath(), 'mods');
      if (existsSync(filePath)) {
        const entries = readdirSync(filePath, { withFileTypes: true });
        event.returnValue = entries
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name);
      } else {
        event.returnValue = null;
      }
    } catch (e) {
      event.returnValue = createError(
        'API.readModDirectory',
        'Failed to read directory',
        String(e)
      );
    }
  });

  ipcMain.on('readFile', (event, [inputPath, isRelative]) => {
    console.log('API.readFile', [inputPath, isRelative]);
    const filePath = isRelative
      ? path.join(getAppPath(), inputPath)
      : inputPath;

    try {
      if (existsSync(filePath)) {
        const result = readFileSync(filePath, {
          encoding: 'utf-8',
          flag: 'r',
        });
        event.returnValue = result;
      } else {
        event.returnValue = null;
      }
    } catch (e) {
      event.returnValue = createError(
        'API.readFile',
        'Failed to read file',
        String(e)
      );
    }
  });

  ipcMain.on('writeFile', (event, [inputPath, isRelative, data]) => {
    console.log('API.writeFile', [inputPath, isRelative]);
    const filePath = isRelative
      ? path.join(getAppPath(), inputPath)
      : inputPath;

    try {
      writeFileSync(filePath, data, {
        encoding: 'utf-8',
        flag: 'w',
      });
      event.returnValue = true;
    } catch (e) {
      event.returnValue = createError(
        'API.writeFile',
        'Failed to write file',
        String(e)
      );
    }
  });

  ipcMain.on('deleteFile', (event, [inputPath, isRelative]) => {
    console.log('API.deleteFile', [inputPath, isRelative]);
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
        event.returnValue = true;
      } else {
        event.returnValue = false;
      }
    } catch (e) {
      event.returnValue = createError(
        'API.deleteFile',
        'Failed to delete file',
        String(e)
      );
    }
  });

  ipcMain.on('copyFile', (event, [fromInputPath, toPath, overwrite]) => {
    console.log('API.copyFile', [fromInputPath, toPath, overwrite]);

    try {
      const fromPath = path.join(getAppPath(), 'mods', fromInputPath);
      if (existsSync(fromPath) && (overwrite || !existsSync(toPath))) {
        const stat = statSync(fromPath);
        if (stat.isDirectory()) {
          copyDirSync(fromPath, toPath);
        } else {
          mkdirSync(path.dirname(toPath), { recursive: true });
          copyFileSync(fromPath, toPath);
        }
        event.returnValue = true;
      } else {
        event.returnValue = false;
      }
    } catch (e) {
      event.returnValue = createError(
        'API.copyFile',
        'Failed to copy file',
        String(e)
      );
    }
  });
}
