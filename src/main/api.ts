import { execFile, execFileSync } from 'child_process';
import { BrowserWindow, app, ipcMain } from 'electron';
import ffi from 'ffi-napi';
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
import json5 from 'json5';
import path from 'path';
import { Scope } from 'quickjs-emscripten';
import ref from 'ref-napi';
import regedit from 'regedit';
import {
  MappingItem,
  NullableMappedPosition,
  SourceMapConsumer,
  SourceMapGenerator,
} from 'source-map';
import ts from 'typescript';
import type { JSONData } from 'bridge/JSON';
import type { ModConfigValue } from 'bridge/ModConfigValue';
import type { TSVDataRow } from 'bridge/TSV';
import packageManifest from '../../release/app/package.json';
import { getConsoleAPI } from './ConsoleAPI';
import { InstallationRuntime } from './InstallationRuntime';
import { getModAPI } from './ModAPI';
import './asar.ts';
import { datamod } from './datamod';
import { getQuickJS } from './quickjs';

function notNull<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}

let runtime: InstallationRuntime | null = null;

function getAppPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, '../')
    : path.join(__dirname, '../../');
}

function getSavesPath(): string {
  return path.join(
    process.env.USERPROFILE ?? path.join(app.getPath('home'), '../'),
    `Saved Games/Diablo II Resurrected/mods/${
      runtime?.options.outputModName ?? 'D2RMM'
    }/`,
  );
}

function getOutputPath(): string {
  if (runtime!.options.isDirectMode) {
    return runtime!.options.dataPath;
  }
  return runtime!.options.mergedPath;
}

function getOutputRootPath(): string {
  if (runtime!.options.isDirectMode) {
    return runtime!.options.dataPath;
  }
  return path.resolve(runtime!.options.mergedPath, '../');
}

// we don't want mods doing any ../../.. shenanigans
function validatePathIsSafe(allowedRoot: string, absolutePath: string): string {
  if (!path.resolve(absolutePath).startsWith(path.resolve(allowedRoot))) {
    throw new Error(
      `Path "${absolutePath}" points outside of allowed directory "${allowedRoot}".`,
    );
  }
  return absolutePath;
}

function resolvePath(inputPath: string, relative: Relative): string {
  switch (relative) {
    case 'App':
      return validatePathIsSafe(
        getAppPath(),
        path.resolve(getAppPath(), inputPath),
      );
    case 'Saves':
      return validatePathIsSafe(
        getSavesPath(),
        path.resolve(getSavesPath(), inputPath),
      );
    case 'Output':
      return validatePathIsSafe(
        getOutputRootPath(),
        path.resolve(getOutputPath(), inputPath),
      );
    case 'None':
      return validatePathIsSafe(
        getOutputRootPath(),
        path.resolve(getOutputPath(), inputPath),
      );
    default:
      throw new Error(
        `Invalid relative value "${relative}" for path "${inputPath}".`,
      );
  }
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
  errorCodeArg?: unknown,
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
    console.debug('BridgeAPI.getVersion');

    const [major, minor, patch] = packageManifest.version
      .split('.')
      .map(Number);
    return [major ?? 0, minor ?? 0, patch ?? 0];
  },

  getAppPath: () => {
    console.debug('BridgeAPI.getAppPath');

    return getAppPath();
  },

  getGamePath: async () => {
    console.debug('BridgeAPI.getGamePath');

    try {
      regedit.setExternalVBSLocation(path.join(getAppPath(), 'tools'));
      const regKey =
        'HKLM\\SOFTWARE\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Diablo II Resurrected';
      const result = await regedit.promisified.list([regKey]);
      return result[regKey].values.InstallLocation.value.toString();
    } catch (error) {
      // useful for debugging, but not useful to expose to user
      console.debug(
        'BridgeAPI.getGamePath',
        'Failed to fetch game path from the registry',
        String(error),
      );
      return null;
    }
  },

  execute: (
    executablePath: string,
    args: string[] = [],
    sync: boolean = false,
  ) => {
    console.debug('BridgeAPI.execute', { executablePath, args, sync });

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
    console.debug('BridgeAPI.openStorage', { gamePath });

    if (!cascStorageIsOpen) {
      if (CascLib.CascOpenStorage(`${gamePath}:osi`, 0, cascStoragePtr)) {
        cascStorageIsOpen = true;
      } else if (CascLib.CascOpenStorage(`${gamePath}:`, 0, cascStoragePtr)) {
        cascStorageIsOpen = true;
      } else {
        return createError(
          'API.openStorage',
          'Failed to open CASC storage',
          `(CascLib Error Code: ${CascLib.GetLastError()})`,
        );
      }
    }

    return cascStorageIsOpen;
  },

  closeStorage: () => {
    console.debug('BridgeAPI.closeStorage');

    if (cascStorageIsOpen) {
      const storage = cascStoragePtr.deref();
      if (CascLib.CascCloseStorage(storage)) {
        cascStorageIsOpen = false;
      } else {
        return createError(
          'API.closeStorage',
          'Failed to close CASC storage',
          `(CascLib Error Code: ${CascLib.GetLastError()})`,
        );
      }
    }

    return !cascStorageIsOpen;
  },

  isGameFile: (filePath: string) => {
    console.debug('BridgeAPI.isGameFile', {
      filePath,
    });

    try {
      if (!cascStorageIsOpen) {
        return createError('BridgeAPI.isGameFile', 'CASC storage is not open');
      }

      const storage = cascStoragePtr.deref();

      const filePtr = ref.alloc(voidPtrPtr);
      if (
        !CascLib.CascOpenFile(storage, `data:data\\${filePath}`, 0, 0, filePtr)
      ) {
        return false;
      }
    } catch (e) {
      return createError(
        'API.isGameFile',
        'Failed to check if a file exists in CASC storage',
        String(e),
      );
    }

    return true;
  },

  extractFile: (filePath: string, targetPath: string) => {
    console.debug('BridgeAPI.extractFile', {
      filePath,
      targetPath,
    });

    try {
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
          `(CascLib Error Code: ${CascLib.GetLastError()})`,
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
          `(CascLib Error Code: ${CascLib.GetLastError()})`,
        );
      }

      if (!CascLib.CascCloseFile(file)) {
        return createError(
          'API.extractFile',
          `Failed to close file in CASC storage (${filePath})`,
          `(CascLib Error Code: ${CascLib.GetLastError()})`,
        );
      }
    } catch (e) {
      return createError(
        'API.extractFile',
        'Failed to extract file',
        String(e),
      );
    }

    return true;
  },

  createDirectory: (filePath: string) => {
    console.debug('BridgeAPI.createDirectory', { filePath });

    try {
      if (!existsSync(filePath)) {
        mkdirSync(filePath, { recursive: true });
        return true;
      }
    } catch (e) {
      return createError(
        'API.createDirectory',
        'Failed to create directory',
        String(e),
      );
    }

    return false;
  },

  readDirectory: (filePath: string) => {
    console.debug('BridgeAPI.readDirectory', { filePath });

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
        String(e),
      );
    }
  },

  readModDirectory: () => {
    console.debug('BridgeAPI.readModDirectory');

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
        String(e),
      );
    }
  },

  readFile: (inputPath: string, relative: Relative) => {
    console.debug('BridgeAPI.readFile', { inputPath, relative });

    try {
      const filePath = resolvePath(inputPath, relative);
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
        String(e),
      );
    }

    return null;
  },

  writeFile: (inputPath: string, relative: Relative, data: string) => {
    console.debug('BridgeAPI.writeFile', { inputPath, relative });

    try {
      const filePath = resolvePath(inputPath, relative);
      mkdirSync(path.dirname(filePath), { recursive: true });
      writeFileSync(filePath, data, {
        encoding: 'utf-8',
        flag: 'w',
      });
    } catch (e) {
      return createError(
        'BridgeAPI.writeFile',
        'Failed to write file',
        String(e),
      );
    }

    return 0;
  },

  readBinaryFile: (inputPath: string, relative: Relative) => {
    console.debug('BridgeAPI.readBinaryFile', {
      inputPath,
      relative,
    });

    try {
      const filePath = resolvePath(inputPath, relative);
      if (existsSync(filePath)) {
        return [
          ...readFileSync(filePath, {
            encoding: null, // binary
            flag: 'r',
          }).values(),
        ];
      }
    } catch (e) {
      return createError(
        'BridgeAPI.readBinaryFile',
        'Failed to read file',
        String(e),
      );
    }

    return null;
  },

  writeBinaryFile: (inputPath: string, relative: Relative, data: number[]) => {
    console.debug('BridgeAPI.writeBinaryFile', {
      inputPath,
      relative,
    });

    try {
      const filePath = resolvePath(inputPath, relative);
      mkdirSync(path.dirname(filePath), { recursive: true });
      writeFileSync(filePath, Buffer.from(data), {
        encoding: null,
        flag: 'w',
      });
    } catch (e) {
      return createError(
        'BridgeAPI.writeBinaryFile',
        'Failed to write file',
        String(e),
      );
    }

    return 0;
  },

  deleteFile: (inputPath: string, relative: Relative) => {
    console.debug('BridgeAPI.deleteFile', { inputPath, relative });

    try {
      const filePath = resolvePath(inputPath, relative);
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
        String(e),
      );
    }

    // file doesn't exist
    return 1;
  },

  copyFile: (
    fromPath: string,
    toPath: string,
    overwrite: boolean = false,
    outCopiedFiles?: CopiedFile[],
  ) => {
    console.debug('BridgeAPI.copyFile', {
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
        const directories: string[] = [fromPath];
        while (directories.length > 0) {
          readdirSync(directories[0], { encoding: null }).forEach((file) => {
            const filePath = path.join(directories[0], file);
            if (statSync(filePath).isDirectory()) {
              directories.push(filePath);
              return;
            }
            outCopiedFiles?.push({
              fromPath: filePath,
              toPath: filePath.replace(path.join(fromPath), toPath),
            });
          });
          directories.shift();
        }
      } else {
        mkdirSync(path.dirname(toPath), { recursive: true });
        copyFileSync(fromPath, toPath);
        outCopiedFiles?.push({ fromPath, toPath });
      }
    } catch (e) {
      return createError(
        'BridgeAPI.copyFile',
        'Failed to copy file',
        String(e),
      );
    }

    // file copied successfully
    return 0;
  },

  readModInfo: (id: string) => {
    console.debug('BridgeAPI.readModInfo', {
      id,
    });

    const result = BridgeAPI.readFile(`mods\\${id}\\mod.json`, 'App');

    if (result instanceof Error || result == null) {
      // check if this is a data mod
      try {
        if (statSync(resolvePath(`mods\\${id}\\data`, 'App')).isDirectory()) {
          return {
            type: 'data',
            name: id,
          };
        }
      } catch {}

      return result;
    }
    try {
      return {
        type: 'd2rmm',
        name: id,
        ...JSON.parse(result),
      };
    } catch (e) {
      return createError(
        'BridgeAPI.readModInfo',
        'Failed to parse mod config',
        String(e),
      );
    }
  },

  readModConfig: (id: string) => {
    console.debug('BridgeAPI.readModConfig', {
      id,
    });

    const filePath = `mods\\${id}\\config.json`;
    const result = BridgeAPI.readFile(filePath, 'App');

    if (result instanceof Error) {
      return result;
    }

    if (result != null) {
      return JSON.parse(result);
    }

    return null;
  },

  writeModConfig: (id: string, value: ModConfigValue) => {
    console.debug('BridgeAPI.writeModConfig', {
      id,
      value,
    });

    const filePath = `mods\\${id}\\config.json`;
    return BridgeAPI.writeFile(filePath, 'App', JSON.stringify(value));
  },

  readModCode: async (id: string) => {
    console.debug('BridgeAPI.readModCode', {
      id,
    });

    // javascript support
    {
      const relativeFilePath = `mods\\${id}\\mod.js`;
      const absoluteFilePath = path.join(getAppPath(), relativeFilePath);
      if (existsSync(absoluteFilePath)) {
        const result = BridgeAPI.readFile(relativeFilePath, 'App');
        if (typeof result !== 'string') {
          return createError(
            'BridgeAPI.readModCode',
            'Failed to read source code.',
            result,
          );
        }

        const code = `(function(){\nconst config = JSON.parse(D2RMM.getConfigJSON());\n${result}\n})()`;

        const sourceMapGenerator = new SourceMapGenerator({
          file: `mods\\${id}\\mod.gen.js`,
          sourceRoot: '',
        });

        code.split('\n').forEach((_line, index) => {
          sourceMapGenerator.addMapping({
            generated: { line: index + 3, column: 1 },
            original: { line: index + 1, column: 1 },
            source: relativeFilePath,
          });
        });

        return [code, sourceMapGenerator.toString()];
      }
    }

    // typescript support
    if (existsSync(path.join(getAppPath(), `mods\\${id}\\mod.ts`))) {
      try {
        type Module = {
          id: string;
        };

        type ModuleWithSourceCode = Module & {
          sourceCode: string;
        };

        type ModuleWithTranspiledCode = ModuleWithSourceCode & {
          transpiledCode: string;
          sourceMapConsumer: SourceMapConsumer | null;
        };

        function processDependencies(
          module: ModuleWithSourceCode,
          absoluteFilePath: string,
        ): Module[] {
          const sourceFile = ts.createSourceFile(
            absoluteFilePath,
            module.sourceCode,
            ts.ScriptTarget.ESNext,
            true,
            ts.ScriptKind.TS,
          );
          const rootPath = path.dirname(module.id + '.ts');
          const dependencies: Module[] = [];
          sourceFile.statements.forEach((statement) => {
            if (ts.isImportDeclaration(statement)) {
              const importPath = statement.moduleSpecifier
                .getText()
                .replace(/^['"](.*)['"]$/, '$1');
              const dependencyPath = path
                // resolve relative paths
                .normalize(`${rootPath}/${importPath}`)
                // keep TS stype paths
                .replace(/\\/g, '/');
              dependencies.push({ id: dependencyPath });
              module.sourceCode = module.sourceCode.replace(
                statement.getFullText(),
                statement
                  .getFullText()
                  .replace(importPath, `./${dependencyPath}`),
              );
            }
          });
          return dependencies;
        }

        const modulesWithSourceCode: ModuleWithSourceCode[] = [];
        const modulesWithTranspiledCode: ModuleWithTranspiledCode[] = [];

        const modulesProcessed: string[] = [];
        function processModule(module: Module): void {
          // TODO: detect circular dependencies and throw an error
          if (modulesProcessed.includes(module.id)) {
            return;
          }
          modulesProcessed.push(module.id);

          const relativeFilePath = `mods\\${id}\\${module.id}.ts`;
          const sourceCode = BridgeAPI.readFile(relativeFilePath, 'App');
          if (typeof sourceCode !== 'string') {
            throw createError(
              'BridgeAPI.readModCode',
              `Failed to read ${relativeFilePath}`,
              sourceCode,
            );
          }

          const moduleWithSourceCode = { ...module, sourceCode };
          const dependencies = processDependencies(
            moduleWithSourceCode,
            path.join(getAppPath(), relativeFilePath),
          );
          dependencies.forEach((m) => processModule(m));
          modulesWithSourceCode.push(moduleWithSourceCode);
        }

        try {
          processModule({ id: 'mod' });
        } catch (error) {
          if (error instanceof Error) {
            return error;
          }
        }

        const sourceMapGenerator = new SourceMapGenerator({
          file: `mods\\${id}\\mod.gen.js`,
          sourceRoot: '',
        });

        for (let i = 0; i < modulesWithSourceCode.length; i++) {
          const module = modulesWithSourceCode[i];

          const transpilationResult = ts.transpileModule(module.sourceCode, {
            compilerOptions: {
              lib: [
                // I dunno why this is all necessary...
                // I just don't want to include DOM since we don't support it here
                'lib.es2015.d.ts',
                'lib.es2016.d.ts',
                'lib.es2017.d.ts',
                'lib.es2018.d.ts',
                'lib.es2019.d.ts',
                'lib.es2020.d.ts',
                'lib.es2021.d.ts',
                'lib.es2022.d.ts',
              ],
              // running webpack inside of electron is a pita and very slow
              // so we're just going to roll our own module import/export system
              // because that's a reaaaallly good idea and
              // definitely won't cause any headaches later
              module: ts.ModuleKind.CommonJS,
              target: ts.ScriptTarget.ES5,
              sourceMap: true,
            },
            moduleName: module.id,
            // errors? what errors! runtime errors!
            // basically, the mod author is responsible for taking care of their
            // own type checking and type errors using their preferred editor
            // D2RMM will just transpile as best it can and run the code
            reportDiagnostics: false,
          });

          const transpiledCode = transpilationResult.outputText;
          const sourceMap = transpilationResult.sourceMapText;
          const sourceMapConsumer =
            sourceMap == null ? null : await new SourceMapConsumer(sourceMap);

          modulesWithTranspiledCode.push({
            ...module,
            transpiledCode,
            sourceMapConsumer,
          });
        }

        const header = `
function require(id) {
  if (require.loadedModules[id] == null) {
    require.load(id);
  }
  return require.loadedModules[id];
}
require.loadedModules = {};
require.load = function(id) {
  const exports = {};
  require.registeredModules[id](exports);
  require.loadedModules[id] = exports;
};
require.registeredModules = {};
require.register = function(id, getModule) {
  require.registeredModules[id] = getModule;
}
const config = JSON.parse(D2RMM.getConfigJSON());
`;
        const code = modulesWithTranspiledCode
          .reduce((agg, module) => {
            const basename = path.basename(module.id);
            const prefix = `require.register('./${module.id}', function ${basename}(exports) {`;
            const suffix = '});';
            const sourceMapConsumer = module.sourceMapConsumer;
            if (sourceMapConsumer != null) {
              const modulePath = `${module.id.replace(/\//g, '\\')}.ts`;
              const source = `mods\\${id}\\${modulePath}`;
              const offset = agg.split('\n').length + prefix.split('\n').length;
              sourceMapConsumer.eachMapping((mapping) => {
                sourceMapGenerator.addMapping({
                  generated: {
                    line: mapping.generatedLine + offset,
                    column: mapping.generatedColumn,
                  },
                  original: {
                    line: mapping.originalLine,
                    column: mapping.originalLine,
                  },
                  name: mapping.name,
                  source,
                });
              });
              sourceMapConsumer.destroy();
              module.sourceMapConsumer = null;
            }
            return [agg, prefix, module.transpiledCode, suffix].join('\n');
          }, header)
          .concat("\nrequire.load('./mod');");
        return [code, sourceMapGenerator.toString()];
      } catch (error) {
        return createError(
          'BridgeAPI.readModCode',
          'Failed to compile mod',
          error,
        );
      }
    }

    return createError(
      'BridgeAPI.readModCode',
      'Could not find source code (mod.ts or mod.js).',
    );
  },

  readTsv: (filePath: string) => {
    console.debug('BridgeAPI.readTsv', {
      filePath,
    });

    const result = BridgeAPI.readFile(filePath, 'None');

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
    console.debug('BridgeAPI.writeTsv', {
      filePath,
    });

    const { headers, rows } = data;
    const headersRaw = headers.join('\t');
    const rowsRaw = rows.map((row) =>
      headers.map((header) => row[header] ?? '').join('\t'),
    );
    const content = [headersRaw, ...rowsRaw, ''].join('\n');
    return BridgeAPI.writeFile(filePath, 'None', content);
  },

  readJson: (filePath) => {
    console.debug('BridgeAPI.readJson', { filePath });

    const result = BridgeAPI.readFile(filePath, 'None');

    if (result instanceof Error) {
      return result;
    }

    if (result == null) {
      console.warn('BridgeAPI.readJson', 'file not found');
      return {};
    }

    const cleanContent = result
      // remove byte order mark
      .replace(/^\uFEFF/, '');
    try {
      return json5.parse<JSONData>(cleanContent);
    } catch (e) {
      return createError(
        'BridgeAPI.readJson',
        'Failed to parse file',
        e instanceof Error ? e.toString() : String(e),
      );
    }
  },

  writeJson: (filePath, data) => {
    console.debug('BridgeAPI.writeJson', { filePath });

    const content = JSON.stringify(data); // we don't use json5 here so that keys are still wrapped in quotes
    const result = BridgeAPI.writeFile(
      filePath,
      'None',
      // add byte order mark (not every vanilla file has one but D2R doesn't seem to mind when it's added)
      `\uFEFF${content}`,
    );

    if (result instanceof Error) {
      return result;
    }

    return result;
  },

  readTxt: (filePath) => {
    console.debug('BridgeAPI.readTxt', { filePath });

    const result = BridgeAPI.readFile(filePath, 'None');

    if (result instanceof Error) {
      return result;
    }

    if (result == null) {
      console.warn('BridgeAPI.readTxt', 'file not found');
      return '';
    }

    return result;
  },

  writeTxt: (filePath, data) => {
    console.debug('BridgeAPI.writeTxt', { filePath });

    const result = BridgeAPI.writeFile(filePath, 'None', data);

    if (result instanceof Error) {
      return result;
    }

    return result;
  },

  installMods: async (modsToInstall: Mod[], options: IInstallModsOptions) => {
    runtime = new InstallationRuntime(
      BridgeAPI,
      console,
      options,
      modsToInstall,
    );
    const action = runtime.options.isDryRun ? 'Uninstall' : 'Install';

    if (!runtime.options.isDirectMode) {
      BridgeAPI.deleteFile(`${runtime.options.mergedPath}\\..`, 'None');
      BridgeAPI.createDirectory(runtime.options.mergedPath);
      BridgeAPI.writeJson(`${runtime.options.mergedPath}\\..\\modinfo.json`, {
        name: runtime.options.outputModName,
        savepath: `${runtime.options.outputModName}/`,
      });
    }

    if (!runtime.options.isPreExtractedData) {
      BridgeAPI.openStorage(runtime.options.gamePath);
    }

    for (let i = 0; i < runtime.modsToInstall.length; i = i + 1) {
      runtime.mod = runtime.modsToInstall[i];
      let code: string = '';
      let sourceMap: string = '';
      try {
        console.debug(`Mod parsing code...`);
        if (runtime.mod.info.type === 'data') {
          code = datamod;
        } else {
          const result = await BridgeAPI.readModCode(runtime.mod.id);
          if (result instanceof Error) {
            throw result;
          }
          if (result == null) {
            throw new Error('Could not read code from mod.js or mod.ts.');
          }
          [code, sourceMap] = result;
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error(`Mod encountered a compile error!\n${error.stack}`);
        }
        continue;
      }
      const scope = new Scope();
      try {
        console.debug(`Mod ${action.toLowerCase()}ing...`);
        const vm = scope.manage(getQuickJS().newContext());
        vm.setProp(vm.global, 'console', getConsoleAPI(vm, scope, console));
        vm.setProp(vm.global, 'D2RMM', getModAPI(vm, scope, runtime));
        scope.manage(vm.unwrapResult(vm.evalCode(code)));
        runtime!.modsInstalled.push(runtime.mod.id);
        console.log(`Mod ${action.toLowerCase()}ed successfully.`);
      } catch (error) {
        if (error instanceof Error) {
          let message = error.message;
          if (error.stack != null && sourceMap !== '') {
            // a constructor that returns a Promise smh
            const sourceMapConsumer = await new SourceMapConsumer(sourceMap);
            message = applySourceMapToStackTrace(
              error.stack
                ?.replace(/\s*at <eval>[\s\S]*/m, '')
                ?.replace(/eval.js/g, `mods\\${runtime.mod.id}\\mod.gen.js`),
              sourceMapConsumer,
            );
            sourceMapConsumer.destroy();
          }
          console.error(`Mod encountered a runtime error!\n${message}`);
        }
      }
      scope.dispose();
    }
    runtime.mod = null;

    if (!runtime.options.isPreExtractedData) {
      BridgeAPI.closeStorage();
    }

    // delete any files that were extracted but then unmodified
    // since they should be the same as the vanilla files in CASC
    if (!runtime.options.isDryRun && !runtime.options.isDirectMode) {
      runtime.fileManager.getUnmodifiedExtractedFiles().forEach((file) => {
        BridgeAPI.deleteFile(runtime!.getDestinationFilePath(file), 'None');
      });
    }

    const modsInstalled = runtime.modsInstalled;
    runtime = null;
    return modsInstalled;
  },
};

export async function initBridgeAPI(mainWindow: BrowserWindow): Promise<void> {
  // hook up bridge API calls
  Object.keys(BridgeAPI).forEach((apiName) => {
    const apiCall = BridgeAPI[apiName as keyof typeof BridgeAPI];
    ipcMain.on(apiName, async (event, args: unknown[] | void) => {
      // @ts-ignore[2556] - can't enforce strict typing for data coming across the bridge
      let result = apiCall(...(args ?? []));
      if (result instanceof Promise) {
        result = await result;
      }
      event.returnValue = result;
    });
  });

  // forward console messages to the renderer process
  const nativeConsole = { ...console };
  const consoleWrapper = { ...console };
  const consoleMethods = ['debug', 'log', 'warn', 'error'] as const;
  consoleMethods.forEach((level: (typeof consoleMethods)[number]) => {
    consoleWrapper[level] = (...args) => {
      const newArgs =
        runtime?.isModInstalling() ?? false
          ? [`[${runtime!.mod!.info.name}]`, ...args]
          : args;
      nativeConsole[level](...newArgs);
      mainWindow.webContents.send('console', [level, newArgs]);
    };
  });
  Object.assign(console, consoleWrapper);
}

function findBestMappingForLine(
  lineNumber: number,
  sourceMapConsumer: SourceMapConsumer,
): NullableMappedPosition {
  let bestMapping: MappingItem | null = null;
  sourceMapConsumer.eachMapping((mapping) => {
    if (
      mapping.generatedLine == lineNumber &&
      (bestMapping == null ||
        mapping.originalColumn < bestMapping.originalColumn)
    ) {
      bestMapping = mapping;
    }
  });
  bestMapping = bestMapping as MappingItem | null; // wtf TS?
  return {
    name: bestMapping?.name ?? null,
    source: bestMapping?.source ?? null,
    line: bestMapping?.originalLine ?? null,
    column: bestMapping?.originalColumn ?? null,
  };
}

function applySourceMapToStackTrace(
  stackTrace: string,
  sourceMapConsumer: SourceMapConsumer,
): string {
  return stackTrace
    .split('\n')
    .map((stackFrame) => {
      const match = stackFrame.match(/at\s+(?:.*)\s+\((.*):(\d+)(?::(\d+))?\)/);
      if (match == null) {
        return stackFrame;
      }

      const generatedPosition = {
        source: match[1],
        line: parseInt(match[2], 10),
        column: parseInt(match[3] ?? '1', 10),
      };

      let originalPosition =
        sourceMapConsumer.originalPositionFor(generatedPosition);
      if (originalPosition.source == null) {
        originalPosition = findBestMappingForLine(
          generatedPosition.line,
          sourceMapConsumer,
        );
      }
      if (originalPosition.source == null) {
        return stackFrame;
      }

      return stackFrame
        .replace(
          `(${generatedPosition.source}:${generatedPosition.line})`,
          `(${originalPosition.source}:${originalPosition.line})`,
        )
        .replace(
          `(${generatedPosition.source}:${generatedPosition.line}:${generatedPosition.column})`,
          `(${originalPosition.source}:${originalPosition.line}:${originalPosition.column})`,
        );
    })
    .filter((stackFrame) => !stackFrame.includes('.gen.js:'))
    .join('\n');
}
