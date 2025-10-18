import type {
  CopiedFile,
  IBridgeAPI,
  IInstallModsOptions,
  Mod,
} from 'bridge/BridgeAPI';
import type { ConsoleAPI, ConsoleArg } from 'bridge/ConsoleAPI';
import type { JSONData } from 'bridge/JSON';
import type { ModConfigValue } from 'bridge/ModConfigValue';
import { Relative } from 'bridge/Relative';
import type { TSVDataRow } from 'bridge/TSV';
import { execFile, execFileSync } from 'child_process';
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
import packageManifest from '../../../release/app/package.json';
import { getAppPath, getHomePath } from './AppInfoAPI';
import {
  dwordPtr,
  getCascLib,
  getLastCascLibError,
  voidPtrPtr,
} from './CascLib';
import { EventAPI } from './EventAPI';
import { provideAPI } from './IPC';
import { InstallationRuntime } from './InstallationRuntime';
import { getModAPI } from './ModAPI';
import './asar';
import { datamod } from './datamod';
import { getQuickJSProxyAPI, getQuickJS } from './quickjs';

function notNull<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}

let runtime: InstallationRuntime | null = null;

export function getRuntime(): InstallationRuntime | null {
  return runtime;
}

function getSavesPath(): string {
  return path.join(
    process.env.USERPROFILE ?? path.join(getHomePath(), '../'),
    'Saved Games/Diablo II Resurrected/',
    runtime!.options.isDirectMode
      ? ''
      : `mods/${runtime?.options.outputModName ?? 'D2RMM'}/`,
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

function createError(
  method: string,
  message: string,
  errorCode?: unknown,
): Error {
  const prefix = `${method}: ${message}`;
  if (errorCode != null) {
    return new Error(`${prefix}: ${String(errorCode)}`);
  }
  return new Error(prefix);
}

// TODO: use CascFindFirstFile & CascFindNextFile to implement an "extractFiles" API
//       that would recursively extract all files in a directory
// e.g. https://github.com/ladislav-zezula/CascLib/blob/4fc4c18bd5a49208337199a7f4256271675cae44/test/CascTest.cpp#L816

const cascStoragePtr = ref.alloc(voidPtrPtr);
let cascStorageIsOpen = false;

export const BridgeAPI: IBridgeAPI = {
  getVersion: async () => {
    console.debug('BridgeAPI.getVersion');

    const [major, minor, patch] = packageManifest.version
      .split('.')
      .map(Number);
    return [major ?? 0, minor ?? 0, patch ?? 0];
  },

  getAppPath: async () => {
    console.debug('BridgeAPI.getAppPath');

    return getAppPath();
  },

  getGamePath: async () => {
    console.debug('BridgeAPI.getGamePath');

    if (process.platform !== 'win32') {
      return null;
    }

    try {
      regedit.setExternalVBSLocation(path.join(getAppPath(), 'tools'));
      const regKey =
        'HKLM\\SOFTWARE\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Diablo II Resurrected';
      const result = await regedit.promisified.list([regKey]);
      const value = result[regKey].values.InstallLocation.value;
      if (value == null) {
        return null;
      }
      return value.toString();
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

  execute: async (
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
      throw createError('BridgeAPI.execute', 'Failed to execute file', error);
    }
  },

  openStorage: async (gamePath: string) => {
    console.debug('BridgeAPI.openStorage', { gamePath });

    // what do these mean? who knows!
    const PATHS = [`${gamePath}:osi`, `${gamePath}:`, `${gamePath}`];

    if (!cascStorageIsOpen) {
      for (const path of PATHS) {
        if (getCascLib().CascOpenStorage(path, 0, cascStoragePtr)) {
          cascStorageIsOpen = true;
          break;
        }
      }
      if (!cascStorageIsOpen) {
        throw createError(
          'BridgeAPI.openStorage',
          'Failed to open CASC storage',
          getLastCascLibError(),
        );
      }
    }

    return cascStorageIsOpen;
  },

  closeStorage: async () => {
    console.debug('BridgeAPI.closeStorage');

    if (cascStorageIsOpen) {
      const storage = cascStoragePtr.deref();
      if (getCascLib().CascCloseStorage(storage)) {
        cascStorageIsOpen = false;
      } else {
        throw createError(
          'BridgeAPI.closeStorage',
          'Failed to close CASC storage',
          getLastCascLibError(),
        );
      }
    }

    return !cascStorageIsOpen;
  },

  isGameFile: async (filePath: string) => {
    console.debug('BridgeAPI.isGameFile', {
      filePath,
    });

    try {
      if (!cascStorageIsOpen) {
        throw createError('BridgeAPI.isGameFile', 'CASC storage is not open');
      }

      const storage = cascStoragePtr.deref();

      const filePtr = ref.alloc(voidPtrPtr);
      if (
        !getCascLib().CascOpenFile(
          storage,
          path.join('data:data', filePath),
          0,
          0,
          filePtr,
        )
      ) {
        return false;
      }
    } catch (e) {
      throw createError(
        'BridgeAPI.isGameFile',
        'Failed to check if a file exists in CASC storage',
        String(e),
      );
    }

    return true;
  },

  extractFile: async (filePath: string, targetPath: string) => {
    console.debug('BridgeAPI.extractFile', {
      filePath,
      targetPath,
    });

    try {
      if (!cascStorageIsOpen) {
        throw createError('BridgeAPI.extractFile', 'CASC storage is not open');
      }

      const storage = cascStoragePtr.deref();

      const filePtr = ref.alloc(voidPtrPtr);
      if (
        !getCascLib().CascOpenFile(
          storage,
          path.join('data:data', filePath),
          0,
          0,
          filePtr,
        )
      ) {
        throw createError(
          'BridgeAPI.extractFile',
          `Failed to open file in CASC storage (${filePath})`,
          getLastCascLibError(),
        );
      }

      const file = filePtr.deref();
      const bytesReadPtr = ref.alloc(dwordPtr);

      // if the file is larger than 10 MB... I got bad news for you.
      const size = 10 * 1024 * 1024;
      const buffer = Buffer.alloc(size) as ref.Pointer<void>;
      buffer.type = ref.types.void;

      if (getCascLib().CascReadFile(file, buffer, size, bytesReadPtr)) {
        const data = buffer.readCString();
        mkdirSync(path.dirname(targetPath), { recursive: true });
        writeFileSync(targetPath, data, {
          encoding: 'utf-8',
          flag: 'w',
        });
      } else {
        throw createError(
          'BridgeAPI.extractFile',
          `Failed to read file in CASC storage (${filePath})`,
          getLastCascLibError(),
        );
      }

      if (!getCascLib().CascCloseFile(file)) {
        throw createError(
          'BridgeAPI.extractFile',
          `Failed to close file in CASC storage (${filePath})`,
          getLastCascLibError(),
        );
      }
    } catch (e) {
      throw createError('API.extractFile', 'Failed to extract file', String(e));
    }

    return true;
  },

  createDirectory: async (filePath: string) => {
    console.debug('BridgeAPI.createDirectory', { filePath });

    try {
      if (!existsSync(filePath)) {
        mkdirSync(filePath, { recursive: true });
        return true;
      }
    } catch (e) {
      throw createError(
        'API.createDirectory',
        'Failed to create directory',
        String(e),
      );
    }

    return false;
  },

  readDirectory: async (filePath: string) => {
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
      throw createError(
        'API.readDirectory',
        'Failed to read directory',
        String(e),
      );
    }
  },

  readModDirectory: async () => {
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
      throw createError(
        'API.readModDirectory',
        'Failed to read directory',
        String(e),
      );
    }
  },

  readFile: async (inputPath: string, relative: Relative) => {
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
      throw createError('BridgeAPI.readFile', 'Failed to read file', String(e));
    }

    return null;
  },

  writeFile: async (inputPath: string, relative: Relative, data: string) => {
    console.debug('BridgeAPI.writeFile', { inputPath, relative });

    try {
      const filePath = resolvePath(inputPath, relative);
      mkdirSync(path.dirname(filePath), { recursive: true });
      writeFileSync(filePath, data, {
        encoding: 'utf-8',
        flag: 'w',
      });
    } catch (e) {
      throw createError(
        'BridgeAPI.writeFile',
        'Failed to write file',
        String(e),
      );
    }

    return 0;
  },

  readBinaryFile: async (inputPath: string, relative: Relative) => {
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
      throw createError(
        'BridgeAPI.readBinaryFile',
        'Failed to read file',
        String(e),
      );
    }

    return null;
  },

  writeBinaryFile: async (
    inputPath: string,
    relative: Relative,
    data: number[],
  ) => {
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
      throw createError(
        'BridgeAPI.writeBinaryFile',
        'Failed to write file',
        String(e),
      );
    }

    return 0;
  },

  deleteFile: async (inputPath: string, relative: Relative) => {
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
      throw createError(
        'BridgeAPI.deleteFile',
        'Failed to delete file',
        String(e),
      );
    }

    // file doesn't exist
    return 1;
  },

  copyFile: async (
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
      throw createError('BridgeAPI.copyFile', 'Failed to copy file', String(e));
    }

    // file copied successfully
    return 0;
  },

  readModInfo: async (id: string) => {
    console.debug('BridgeAPI.readModInfo', {
      id,
    });

    const result = await BridgeAPI.readFile(
      path.join('mods', id, 'mod.json'),
      'App',
    );

    if (result == null) {
      // check if this is a data mod
      try {
        if (
          statSync(
            resolvePath(path.join('mods', id, 'data'), 'App'),
          ).isDirectory()
        ) {
          return {
            type: 'data',
            name: id,
          };
        }
      } catch {
        // it's okay if this operation fails
      }
    }

    if (result == null) {
      throw createError('BridgeAPI.readModInfo', 'Failed to read mod config');
    }

    try {
      return {
        type: 'd2rmm',
        name: id,
        ...JSON.parse(result),
      };
    } catch (e) {
      throw createError(
        'BridgeAPI.readModInfo',
        'Failed to parse mod config',
        String(e),
      );
    }
  },

  readModConfig: async (id: string) => {
    console.debug('BridgeAPI.readModConfig', {
      id,
    });

    const filePath = path.join('mods', id, 'config.json');
    const result = await BridgeAPI.readFile(filePath, 'App');

    if (result != null) {
      return JSON.parse(result);
    }

    return null;
  },

  writeModConfig: async (id: string, value: ModConfigValue) => {
    console.debug('BridgeAPI.writeModConfig', {
      id,
      value,
    });

    const filePath = path.join('mods', id, 'config.json');
    return await BridgeAPI.writeFile(filePath, 'App', JSON.stringify(value));
  },

  readModCode: async (id: string) => {
    console.debug('BridgeAPI.readModCode', {
      id,
    });

    // javascript support
    {
      const relativeFilePath = path.join('mods', id, 'mod.js');
      const absoluteFilePath = path.resolve(getAppPath(), relativeFilePath);
      if (existsSync(absoluteFilePath)) {
        const result = await BridgeAPI.readFile(relativeFilePath, 'App');
        if (typeof result !== 'string') {
          throw createError(
            'BridgeAPI.readModCode',
            'Failed to read source code.',
            result,
          );
        }

        const code = `(function(){\nconst config = JSON.parse(D2RMM.getConfigJSON());\n${result}\n})()`;

        const sourceMapGenerator = new SourceMapGenerator({
          file: path.join('mods', id, 'mod.gen.js'),
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
    if (existsSync(path.join(getAppPath(), 'mods', id, 'mod.ts'))) {
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
        async function processModule(module: Module): Promise<void> {
          // TODO: detect circular dependencies and throw an error
          if (modulesProcessed.includes(module.id)) {
            return;
          }
          modulesProcessed.push(module.id);

          const relativeFilePath = path.join('mods', id, `${module.id}.ts`);
          const sourceCode = await BridgeAPI.readFile(relativeFilePath, 'App');
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
          for (const dependency of dependencies) {
            await processModule(dependency);
          }
          modulesWithSourceCode.push(moduleWithSourceCode);
        }

        try {
          await processModule({ id: 'mod' });
        } catch (error) {
          if (error instanceof Error) {
            throw error;
          }
        }

        const sourceMapGenerator = new SourceMapGenerator({
          file: path.join('mods', id, 'mod.gen.js'),
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
              const pathSeparator = process.platform === 'win32' ? '\\' : '/';
              const modulePath = `${module.id.replace(/\//g, pathSeparator)}.ts`;
              const source = path.join('mods', id, modulePath);
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
        throw createError(
          'BridgeAPI.readModCode',
          'Failed to compile mod',
          error,
        );
      }
    }

    throw createError(
      'BridgeAPI.readModCode',
      'Could not find source code (mod.ts or mod.js).',
    );
  },

  readTsv: async (filePath: string) => {
    console.debug('BridgeAPI.readTsv', {
      filePath,
    });

    const result = await BridgeAPI.readFile(filePath, 'None');

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

  writeTsv: async (filePath, data) => {
    console.debug('BridgeAPI.writeTsv', {
      filePath,
    });

    const { headers, rows } = data;
    const headersRaw = headers.join('\t');
    const rowsRaw = rows.map((row) =>
      headers.map((header) => row[header] ?? '').join('\t'),
    );
    const content = [headersRaw, ...rowsRaw, ''].join('\n');
    return await BridgeAPI.writeFile(filePath, 'None', content);
  },

  readJson: async (filePath) => {
    console.debug('BridgeAPI.readJson', { filePath });

    const result = await BridgeAPI.readFile(filePath, 'None');

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
      throw createError(
        'BridgeAPI.readJson',
        'Failed to parse file',
        e instanceof Error ? e.toString() : String(e),
      );
    }
  },

  writeJson: async (filePath, data) => {
    console.debug('BridgeAPI.writeJson', { filePath });

    const content = JSON.stringify(data); // we don't use json5 here so that keys are still wrapped in quotes
    const result = await BridgeAPI.writeFile(
      filePath,
      'None',
      // add byte order mark (not every vanilla file has one but D2R doesn't seem to mind when it's added)
      `\uFEFF${content}`,
    );

    return result;
  },

  readTxt: async (filePath) => {
    console.debug('BridgeAPI.readTxt', { filePath });

    const result = await BridgeAPI.readFile(filePath, 'None');

    if (result == null) {
      console.warn('BridgeAPI.readTxt', 'file not found');
      return '';
    }

    return result;
  },

  writeTxt: async (filePath, data) => {
    console.debug('BridgeAPI.writeTxt', { filePath });

    return await BridgeAPI.writeFile(filePath, 'None', data);
  },

  installMods: async (modsToInstall: Mod[], options: IInstallModsOptions) => {
    console.debug('BridgeAPI.installMods', {
      modsToInstall: modsToInstall.map((mod) => mod.id),
      options,
    });

    runtime = new InstallationRuntime(
      BridgeAPI,
      console,
      options,
      modsToInstall,
    );
    const action = runtime.options.isDryRun ? 'Uninstall' : 'Install';

    if (!runtime.options.isDirectMode) {
      await BridgeAPI.deleteFile(
        path.join(runtime.options.mergedPath, '..'),
        'None',
      );
      await BridgeAPI.createDirectory(runtime.options.mergedPath);
      await BridgeAPI.writeJson(
        path.join(runtime.options.mergedPath, '..', 'modinfo.json'),
        {
          name: runtime.options.outputModName,
          savepath: `${runtime.options.outputModName}/`,
        },
      );
    }

    if (!runtime.options.isPreExtractedData) {
      await BridgeAPI.openStorage(runtime.options.gamePath);
    }

    for (let i = 0; i < runtime.modsToInstall.length; i = i + 1) {
      const startTime = Date.now();
      EventAPI.send(
        'installationProgress',
        i,
        runtime.modsToInstall.length,
      ).catch(console.error);
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
        vm.setProp(
          vm.global,
          'console',
          getQuickJSProxyAPI(vm, scope, {
            debug: async (...args: ConsoleArg[]) => {
              console.debug(...args);
            },
            log: async (...args: ConsoleArg[]) => {
              console.log(...args);
            },
            warn: async (...args: ConsoleArg[]) => {
              console.warn(...args);
            },
            error: async (...args: ConsoleArg[]) => {
              console.error(...args);
            },
          } as ConsoleAPI),
        );
        vm.setProp(
          vm.global,
          'D2RMM',
          getQuickJSProxyAPI(vm, scope, getModAPI(runtime)),
        );
        scope.manage(vm.unwrapResult(await vm.evalCodeAsync(code)));
        runtime!.modsInstalled.push(runtime.mod.id);
        console.debug(
          `Mod ${action.toLowerCase()} took ${Date.now() - startTime}ms.`,
        );
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
                ?.replace(
                  /eval.js/g,
                  path.join('mods', runtime.mod.id, 'mod.gen.js'),
                ),
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

    EventAPI.send(
      'installationProgress',
      runtime.modsToInstall.length,
      runtime.modsToInstall.length,
    ).catch(console.error);

    if (!runtime.options.isPreExtractedData) {
      await BridgeAPI.closeStorage();
    }

    // delete any files that were extracted but then unmodified
    // since they should be the same as the vanilla files in CASC
    if (!runtime.options.isDryRun && !runtime.options.isDirectMode) {
      for (const file of runtime.fileManager.getUnmodifiedExtractedFiles()) {
        await BridgeAPI.deleteFile(
          runtime!.getDestinationFilePath(file),
          'None',
        );
      }
    }

    const modsInstalled = runtime.modsInstalled;
    runtime = null;
    return modsInstalled;
  },
};

export async function initBridgeAPI(): Promise<void> {
  provideAPI('BridgeAPI', BridgeAPI);
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
