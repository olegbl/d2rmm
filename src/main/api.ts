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

const CascLib = ffi.Library(path.join(getAppPath(), 'tools', 'CascLib.dll'), {
  CascCloseFile: ['bool', [voidPtr]],
  CascCloseStorage: ['bool', [voidPtr]],
  CascOpenFile: ['bool', [voidPtr, 'string', 'int', 'int', voidPtrPtr]],
  CascOpenStorage: ['bool', ['string', 'int', voidPtrPtr]],
  CascReadFile: ['bool', [voidPtr, voidPtr, 'int', dwordPtr]],
});

export function createAPI(): void {
  ipcMain.on('extractFile', (event, [gamePath, filePath, targetPath]) => {
    console.log('API.extractFile', [gamePath, filePath, targetPath]);

    try {
      // if file is already extracted, don't need to extract it again
      if (existsSync(targetPath)) {
        event.returnValue = true;
        return;
      }

      const storagePtr = ref.alloc(voidPtrPtr);
      if (CascLib.CascOpenStorage(`${gamePath}:osi`, 0, storagePtr)) {
        const storage = storagePtr.deref();

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
            console.log('API.extractFile', 'Failed to read CASC file');
          }

          if (!CascLib.CascCloseFile(file)) {
            console.log('API.extractFile', 'Failed to close CASC file');
          }
        } else {
          console.log('API.extractFile', 'Failed to open CASC file');
        }

        if (!CascLib.CascCloseStorage(storage)) {
          console.log('API.extractFile', 'Failed to close CASC storage');
        }
      } else {
        console.log('API.extractFile', 'Failed to open CASC storage');
      }
    } catch (e) {
      console.error('API.extractFile', e);
      event.returnValue = false;
    }

    if (typeof event.returnValue !== 'boolean') {
      event.returnValue = false;
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
      console.error('API.createDirectory', e);
      event.returnValue = null;
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
      console.error('API.readModDirectory', e);
      event.returnValue = null;
    }
  });

  ipcMain.on('readFile', (event, [inputPath, isRelative]) => {
    console.log('API.readFile', [inputPath, isRelative]);
    const filePath = isRelative
      ? path.join(getAppPath(), inputPath)
      : inputPath;

    try {
      if (existsSync(filePath)) {
        event.returnValue = readFileSync(filePath, {
          encoding: 'utf-8',
          flag: 'r',
        });
      } else {
        event.returnValue = null;
      }
    } catch (e) {
      console.error('API.readFile', e);
      event.returnValue = null;
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
      console.error('API.writeFile', e);
      event.returnValue = null;
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
      console.error('API.deleteFile', e);
      event.returnValue = null;
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
      console.error('API.copyFile', e);
      event.returnValue = null;
    }
  });
}
