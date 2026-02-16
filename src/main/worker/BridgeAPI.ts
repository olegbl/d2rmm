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
import type { ID2S, IStash } from 'bridge/third-party/d2s/d2/types';
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
import path from 'path';
import { Scope } from 'quickjs-emscripten';
import regedit from 'regedit';
import {
  MappingItem,
  NullableMappedPosition,
  SourceMapConsumer,
  SourceMapGenerator,
} from 'source-map';
import ts from 'typescript';
import packageManifest from '../../../release/app/package.json';
import { getAppPath, getBaseSavesPath } from './AppInfoAPI';
import { getCascLib, getLastCascLibError, readCString } from './CascLib';
import { EventAPI } from './EventAPI';
import { provideAPI } from './IPC';
import { InstallationRuntime } from './InstallationRuntime';
import { encodeJson, parseJson } from './JSONParser';
import { getModAPI } from './ModAPI';
import { parseSprite } from './SpriteParser';
import { encodeTsv, parseTsv } from './TSVParser';
import './asar';
import { datamod } from './datamod';
import { getQuickJSProxyAPI, getQuickJS } from './quickjs';
import * as d2s from './third-party/d2s/index';

let runtime: InstallationRuntime | null = null;

export function getRuntime(): InstallationRuntime | null {
  return runtime;
}

function getSavesPath(): string {
  return path.resolve(runtime!.options.savesPath);
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

type CopyDirResult = {
  copiedFiles: CopiedFile[];
  errors: string[];
};

function copyDirSync(
  src: string,
  dest: string,
  options: { isDryRun: boolean; overwrite: boolean },
): CopyDirResult {
  const result: CopyDirResult = { copiedFiles: [], errors: [] };

  if (!options.isDryRun) {
    mkdirSync(dest, { recursive: true });
  }

  let entries;
  try {
    entries = readdirSync(src, { withFileTypes: true });
  } catch (e) {
    result.errors.push(`Failed to read directory "${src}": ${String(e)}`);
    return result;
  }

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      const subResult = copyDirSync(srcPath, destPath, options);
      result.copiedFiles.push(...subResult.copiedFiles);
      result.errors.push(...subResult.errors);
    } else {
      // during dry run (uninstall), skip the overwrite check since we need
      // to track all files that would have been copied for reverting
      if (!options.isDryRun && !options.overwrite && existsSync(destPath)) {
        continue;
      }
      try {
        if (!options.isDryRun) {
          copyFileSync(srcPath, destPath);
        }
        result.copiedFiles.push({ fromPath: srcPath, toPath: destPath });
      } catch (e) {
        result.errors.push(
          `Failed to copy "${srcPath}" to "${destPath}": ${String(e)}`,
        );
      }
    }
  }

  return result;
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

let cascStorage: unknown = null;
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
        const storageOut: unknown[] = [null];
        if (getCascLib().CascOpenStorage(path, 0, storageOut)) {
          cascStorage = storageOut[0];
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
      if (getCascLib().CascCloseStorage(cascStorage)) {
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

      const fileOut: unknown[] = [null];
      if (
        !getCascLib().CascOpenFile(
          cascStorage,
          path.join('data:data', filePath),
          0,
          0,
          fileOut,
        )
      ) {
        return false;
      }

      getCascLib().CascCloseFile(fileOut[0]);
    } catch (e) {
      throw createError(
        'BridgeAPI.isGameFile',
        'Failed to check if a file exists in CASC storage',
        String(e),
      );
    }

    return true;
  },

  extractFileToMemory: async (filePath) => {
    console.debug('BridgeAPI.extractFileToMemory', { filePath });
    let output: null | Buffer = null;

    try {
      if (!cascStorageIsOpen) {
        throw createError(
          'BridgeAPI.extractFileToMemory',
          'CASC storage is not open',
        );
      }

      const fileOut: unknown[] = [null];
      if (
        !getCascLib().CascOpenFile(
          cascStorage,
          path.join('data:data', filePath),
          0,
          0,
          fileOut,
        )
      ) {
        throw createError(
          'BridgeAPI.extractFileToMemory',
          `Failed to open file in CASC storage (${filePath})`,
          getLastCascLibError(),
        );
      }

      const file = fileOut[0];
      const bytesReadOut: number[] = [0];

      // if the file is larger than 10 MB... I got bad news for you.
      const size = 10 * 1024 * 1024;
      const buffer = Buffer.alloc(size);

      if (getCascLib().CascReadFile(file, buffer, size, bytesReadOut)) {
        output = Buffer.from(buffer.buffer, 0, bytesReadOut[0]);
      } else {
        throw createError(
          'BridgeAPI.extractFileToMemory',
          `Failed to read file in CASC storage (${filePath})`,
          getLastCascLibError(),
        );
      }

      if (!getCascLib().CascCloseFile(file)) {
        throw createError(
          'BridgeAPI.extractFileToMemory',
          `Failed to close file in CASC storage (${filePath})`,
          getLastCascLibError(),
        );
      }
    } catch (e) {
      throw createError(
        'BridgeAPI.extractFileToMemory',
        'Failed to extract file',
        String(e),
      );
    }

    return output;
  },

  extractFileToDisk: async (filePath, targetPath) => {
    console.debug('BridgeAPI.extractFileToDisk', {
      filePath,
      targetPath,
    });

    try {
      const buffer = await BridgeAPI.extractFileToMemory(filePath);
      // there's some weird shenanigans with 0-byte-terminated
      // buffers when reading file via Casc lib + ffi, but we
      // *currently* don't support binary file reading in mods
      // anyway (only in save editor), so just work around it
      // here for now, but this needs a proper fix later on
      const dataStr = readCString(buffer);
      await BridgeAPI.writeTextFile(targetPath, 'None', dataStr);
    } catch (e) {
      throw createError(
        'BridgeAPI.extractFileToDisk',
        'Failed to extract file',
        String(e),
      );
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
        'BridgeAPI.createDirectory',
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
        'BridgeAPI.readDirectory',
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
          .filter(
            (entry) =>
              entry.isDirectory() ||
              (entry.isSymbolicLink() &&
                statSync(path.join(filePath, entry.name)).isDirectory()),
          )
          .map((entry) => entry.name);
      }
      return [];
    } catch (e) {
      throw createError(
        'BridgeAPI.readModDirectory',
        'Failed to read directory',
        String(e),
      );
    }
  },

  readFile: async (inputPath, relative) => {
    console.debug('BridgeAPI.readFile', {
      inputPath,
      relative,
    });

    try {
      const filePath = resolvePath(inputPath, relative);
      if (existsSync(filePath)) {
        return readFileSync(filePath, {
          encoding: null, // binary
          flag: 'r',
        });
      }
    } catch (e) {
      throw createError('BridgeAPI.readFile', 'Failed to read file', String(e));
    }

    return null;
  },

  writeFile: async (inputPath: string, relative: Relative, data: Buffer) => {
    console.debug('BridgeAPI.writeFile', { inputPath, relative });

    try {
      const filePath = resolvePath(inputPath, relative);
      mkdirSync(path.dirname(filePath), { recursive: true });
      writeFileSync(filePath, data, {
        encoding: null, // binary
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

  readTextFile: async (inputPath: string, relative: Relative) => {
    console.debug('BridgeAPI.readTextFile', { inputPath, relative });

    try {
      const buffer = await BridgeAPI.readFile(inputPath, relative);
      if (buffer != null) {
        return buffer.toString('utf-8');
      }
    } catch (e) {
      throw createError(
        'BridgeAPI.readTextFile',
        'Failed to read file',
        String(e),
      );
    }

    return null;
  },

  writeTextFile: async (
    inputPath: string,
    relative: Relative,
    data: string,
  ) => {
    console.debug('BridgeAPI.writeTextFile', { inputPath, relative });

    try {
      const buffer = Buffer.from(data, 'utf-8');
      return await BridgeAPI.writeFile(inputPath, relative, buffer);
    } catch (e) {
      throw createError(
        'BridgeAPI.writeTextFile',
        'Failed to write file',
        String(e),
      );
    }
  },

  readBinaryFile: async (inputPath, relative) => {
    console.debug('BridgeAPI.readBinaryFile', {
      inputPath,
      relative,
    });

    try {
      const buffer = await BridgeAPI.readFile(inputPath, relative);
      if (buffer != null) {
        return [...buffer.values()];
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

  writeBinaryFile: async (inputPath, relative, data) => {
    console.debug('BridgeAPI.writeBinaryFile', {
      inputPath,
      relative,
    });

    try {
      const buffer = Buffer.from(data);
      return await BridgeAPI.writeFile(inputPath, relative, buffer);
    } catch (e) {
      throw createError(
        'BridgeAPI.writeBinaryFile',
        'Failed to write file',
        String(e),
      );
    }
  },

  readTsv: async (filePath, relative) => {
    console.debug('BridgeAPI.readTsv', { filePath });
    const textData = await BridgeAPI.readTextFile(filePath, relative);
    try {
      return parseTsv(textData);
    } catch (e) {
      throw createError(
        'BridgeAPI.readTsv',
        'Failed to parse file',
        e instanceof Error ? e.toString() : String(e),
      );
    }
  },

  writeTsv: async (filePath, relative, data) => {
    console.debug('BridgeAPI.writeTsv', { filePath });
    const textData = encodeTsv(data);
    return await BridgeAPI.writeTextFile(filePath, relative, textData);
  },

  readJson: async (filePath, relative) => {
    console.debug('BridgeAPI.readJson', { filePath });
    const textData = await BridgeAPI.readTextFile(filePath, relative);
    try {
      return parseJson(textData);
    } catch (e) {
      throw createError(
        'BridgeAPI.readJson',
        'Failed to parse file',
        e instanceof Error ? e.toString() : String(e),
      );
    }
  },

  writeJson: async (filePath, relative, data) => {
    console.debug('BridgeAPI.writeJson', { filePath });
    const textData = encodeJson(data);
    return await BridgeAPI.writeTextFile(filePath, relative, textData);
  },

  readTxt: async (filePath, relative) => {
    console.debug('BridgeAPI.readTxt', { filePath });
    return (await BridgeAPI.readTextFile(filePath, relative)) ?? '';
  },

  writeTxt: async (filePath, relative, data) => {
    console.debug('BridgeAPI.writeTxt', { filePath });
    return await BridgeAPI.writeTextFile(filePath, relative, data);
  },

  deleteFile: async (inputPath: string, relative: Relative) => {
    console.debug('BridgeAPI.deleteFile', { inputPath, relative });

    try {
      const filePath = resolvePath(inputPath, relative);
      if (existsSync(filePath)) {
        const stat = statSync(filePath);
        if (stat.isDirectory()) {
          rmSync(filePath, {
            recursive: true,
            force: true,
            maxRetries: 3,
            retryDelay: 100,
          });
        } else {
          rmSync(filePath, { force: true, maxRetries: 3, retryDelay: 100 });
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
    isDryRun: boolean = false,
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

      const stat = statSync(fromPath);
      if (stat.isDirectory()) {
        const { copiedFiles, errors } = copyDirSync(fromPath, toPath, {
          isDryRun,
          overwrite,
        });
        if (errors.length > 0) {
          throw createError(
            'BridgeAPI.copyFile',
            `${errors.length} error(s) while copying directory`,
            errors.join('\n'),
          );
        }
        outCopiedFiles?.push(...copiedFiles);
      } else {
        if (existsSync(toPath) && !overwrite) {
          // destination file already exists
          return 1;
        }
        if (!isDryRun) {
          mkdirSync(path.dirname(toPath), { recursive: true });
          copyFileSync(fromPath, toPath);
        }
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

    const result = await BridgeAPI.readTextFile(
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
    const result = await BridgeAPI.readTextFile(filePath, 'App');

    if (result != null) {
      try {
        return JSON.parse(result);
      } catch (e) {
        throw createError(
          'BridgeAPI.readModConfig',
          'Failed to parse mod config',
          String(e),
        );
      }
    }

    return null;
  },

  writeModConfig: async (id: string, value: ModConfigValue) => {
    console.debug('BridgeAPI.writeModConfig', {
      id,
      value,
    });

    const filePath = path.join('mods', id, 'config.json');
    return await BridgeAPI.writeTextFile(
      filePath,
      'App',
      JSON.stringify(value),
    );
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
        const result = await BridgeAPI.readTextFile(relativeFilePath, 'App');
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
          const sourceCode = await BridgeAPI.readTextFile(
            relativeFilePath,
            'App',
          );
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
          throw error instanceof Error ? error : new Error(String(error));
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
                    column: mapping.originalColumn,
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

  // TODO: improve API signatures for ED2R APIs

  writeSaveFile: async (
    options: IInstallModsOptions,
    fileName: string,
    parsedData: ID2S | IStash,
  ) => {
    console.debug('BridgeAPI.writeSaveFile', {
      fileName,
    });

    runtime = new InstallationRuntime(BridgeAPI, console, options, []);

    try {
      const rawData = fileName.endsWith('.d2s')
        ? await d2s.write(parsedData as ID2S)
        : fileName.endsWith('.d2i')
          ? await d2s.stash.write(parsedData as IStash)
          : null;

      if (rawData == null) {
        throw createError(
          'BridgeAPI.writeSaveFile',
          'Invalid file name (does not end in d2s or d2i).',
        );
      }

      // TODO: base this off of when the file was first read instead
      const timestamp = new Date()
        .toISOString()
        .slice(0, -5)
        .replace(/[T:]/g, '-');

      const originalRawData = await BridgeAPI.readBinaryFile(fileName, 'Saves');
      if (originalRawData != null) {
        await BridgeAPI.writeBinaryFile(
          `${fileName}.bak-${timestamp}`,
          'Saves',
          Array.from(originalRawData),
        );
      }

      return await BridgeAPI.writeBinaryFile(
        fileName,
        'Saves',
        Array.from(rawData),
      );
    } finally {
      runtime = null;
    }
  },

  readD2SData: async (options: IInstallModsOptions) => {
    console.debug('BridgeAPI.readD2SData', {
      options,
    });

    runtime = new InstallationRuntime(BridgeAPI, console, options, []);

    try {
      if (!runtime.options.isPreExtractedData) {
        await BridgeAPI.openStorage(runtime.options.gamePath);
      }

      const d2sFiles = [
        path.join('local', 'lng', 'strings', 'item-gems.json'),
        path.join('local', 'lng', 'strings', 'item-modifiers.json'),
        path.join('local', 'lng', 'strings', 'item-nameaffixes.json'),
        path.join('local', 'lng', 'strings', 'item-names.json'),
        path.join('local', 'lng', 'strings', 'item-runes.json'),
        path.join('local', 'lng', 'strings', 'skills.json'),
        path.join('global', 'excel', 'charstats.txt'),
        path.join('global', 'excel', 'playerclass.txt'),
        path.join('global', 'excel', 'skilldesc.txt'),
        path.join('global', 'excel', 'skills.txt'),
        path.join('global', 'excel', 'raresuffix.txt'),
        path.join('global', 'excel', 'rareprefix.txt'),
        path.join('global', 'excel', 'magicprefix.txt'),
        path.join('global', 'excel', 'magicsuffix.txt'),
        path.join('global', 'excel', 'properties.txt'),
        path.join('global', 'excel', 'itemstatcost.txt'),
        path.join('global', 'excel', 'runes.txt'),
        path.join('global', 'excel', 'setitems.txt'),
        path.join('global', 'excel', 'uniqueitems.txt'),
        path.join('global', 'excel', 'itemtypes.txt'),
        path.join('global', 'excel', 'armor.txt'),
        path.join('global', 'excel', 'weapons.txt'),
        path.join('global', 'excel', 'misc.txt'),
        path.join('global', 'excel', 'gems.txt'),
      ];

      async function getGameFile(filePath: string): Promise<Buffer> {
        // check if the file exists in the generated MPQ mod
        if (existsSync(runtime!.getDestinationFilePath(filePath))) {
          const buffer = await BridgeAPI.readFile(
            runtime!.getDestinationFilePath(filePath),
            'None',
          );
          if (buffer == null) {
            throw createError(
              'BridgeAPI.readD2SData',
              'Failed to read file',
              runtime!.getDestinationFilePath(filePath),
            );
          }
          return buffer;
        } else {
          if (runtime!.options.isDirectMode) {
            throw createError(
              'BridgeAPI.readD2SData',
              'Failed to find file',
              runtime!.getDestinationFilePath(filePath),
            );
          }
        }

        // read file from pre-extracted data
        if (runtime!.options.isPreExtractedData) {
          if (existsSync(runtime!.getPreExtractedSourceFilePath(filePath))) {
            const buffer = await BridgeAPI.readFile(
              runtime!.getPreExtractedSourceFilePath(filePath),
              'None',
            );
            if (buffer == null) {
              throw createError(
                'BridgeAPI.readD2SData',
                'Failed to read file',
                runtime!.getPreExtractedSourceFilePath(filePath),
              );
            }
            return buffer;
          } else {
            throw createError(
              'BridgeAPI.readD2SData',
              'Failed to find file',
              runtime!.getPreExtractedSourceFilePath(filePath),
            );
          }
        }
        // read file from Casc archive
        else if (!runtime!.options.isDirectMode) {
          const buffer = await BridgeAPI.extractFileToMemory(
            path.join(filePath),
          );
          return buffer;
        }

        throw createError(
          'BridgeAPI.readD2SData',
          'Failed to find file',
          filePath,
        );
      }

      const buffers: { [key: string]: string } = {};
      for (const filePath of d2sFiles) {
        buffers[path.basename(filePath)] = readCString(
          await getGameFile(filePath),
        );
      }

      const gameData = d2s.readConstantData(buffers as d2s.Buffers);
      d2s.setConstantData(96, gameData);
      d2s.setConstantData(97, gameData);
      d2s.setConstantData(98, gameData);
      d2s.setConstantData(99, gameData);
      d2s.setConstantData(105, gameData);

      const saveFiles = await BridgeAPI.readDirectory(getSavesPath());

      const characterFiles = saveFiles.filter(
        (file) => !file.isDirectory && file.name.endsWith('.d2s'),
      );
      const characterFilesData: [string, ID2S][] = [];
      for (const file of characterFiles) {
        try {
          const rawData = await BridgeAPI.readBinaryFile(file.name, 'Saves');
          if (rawData == null) {
            throw new Error(`File content could not be read.`);
          }
          const parsedData = await d2s.read(new Uint8Array(rawData));
          characterFilesData.push([file.name, parsedData]);
        } catch (e) {
          console.error(
            `Failed to read character save data from "${file.name}".`,
            (e as Error).message,
          );
          continue;
        }
      }
      const characters = Object.fromEntries(characterFilesData);

      const stashFiles = saveFiles.filter(
        (file) => !file.isDirectory && file.name.endsWith('.d2i'),
      );
      const stashFilesData: [string, IStash][] = [];
      for (const file of stashFiles) {
        try {
          const rawData = await BridgeAPI.readBinaryFile(file.name, 'Saves');
          if (rawData == null) {
            throw new Error(`File content could not be read.`);
          }
          const parsedData = await d2s.stash.read(new Uint8Array(rawData));
          stashFilesData.push([file.name, parsedData]);
        } catch (e) {
          console.error(
            `Failed to read character save data from "${file.name}".`,
            (e as Error).message,
          );
          continue;
        }
      }
      const stashes = Object.fromEntries(stashFilesData);

      // TODO: .d2x offline stash files
      // const offlineStashFiles = saveFiles.filter(
      //   (file) => !file.isDirectory && file.name.endsWith('.d2x'),
      // );

      // game files that the UI will need to render the save files
      const gameFiles: { [filePath: string]: TSVData | JSONData | string } = {};

      // JSON
      for (const filePath of [
        'global/ui/layouts/_profilehd.json',
        'hd/items/items.json',
        'hd/items/sets.json',
        'hd/items/uniques.json',
      ]) {
        gameFiles[filePath] = parseJson(
          readCString(await getGameFile(filePath)),
        );
      }

      // TSV
      for (const filePath of [
        'global/excel/itemtypes.txt',
        'global/excel/weapons.txt',
        'global/excel/armor.txt',
        'global/excel/misc.txt',
        'global/excel/uniqueitems.txt',
        'global/excel/setitems.txt',
        'global/excel/inventory.txt',
      ]) {
        gameFiles[filePath] = parseTsv(
          readCString(await getGameFile(filePath)),
        );
      }

      const itemCodeToCategory: { [code: string]: string } = {};
      const itemCodeToItemRow: { [code: string]: TSVDataRow } = {};
      for (const [filePath, category] of [
        ['global/excel/weapons.txt', 'weapon'], // thanks, D2
        ['global/excel/armor.txt', 'armor'],
        ['global/excel/misc.txt', 'misc'],
      ]) {
        for (const row of (gameFiles[filePath] as TSVData).rows) {
          if ((row.code ?? '') === '') {
            continue;
          }
          itemCodeToCategory[row.code] = category;
          itemCodeToItemRow[row.code] = row;
        }
      }

      const itemTypeToItemTypesRow: { [code: string]: TSVDataRow } = {};
      const itemsTypes = gameFiles['global/excel/itemtypes.txt'] as TSVData;
      for (const row of itemsTypes.rows) {
        itemTypeToItemTypesRow[row.Code] = row;
      }

      function getAssetCodeFromIndex(index: string): string {
        return index.toLowerCase().replace(/'/g, '').replace(/ /g, '_');
      }
      const assetIDToItemCodes: { [assetID: string]: string } = {};
      const setItems = gameFiles['global/excel/setitems.txt'] as TSVData;
      for (const setItem of setItems.rows) {
        const assetID = getAssetCodeFromIndex(setItem.index);
        assetIDToItemCodes[assetID] = setItem.code;
      }
      const uniqueItems = gameFiles['global/excel/uniqueitems.txt'] as TSVData;
      for (const uniqueItem of uniqueItems.rows) {
        const assetID = getAssetCodeFromIndex(uniqueItem.index);
        assetIDToItemCodes[assetID] = uniqueItem.code;
      }

      async function extractSprite(
        itemCode: string,
        asset: string,
      ): Promise<void> {
        try {
          const category = itemCodeToCategory[itemCode];
          if (category == null) {
            console.warn(
              `Could not find category for item code "${itemCode}".`,
            );
            return;
          }
          const filePath = `hd/global/ui/items/${category}/${asset}.lowend.sprite`;
          if (gameFiles[filePath] != null) {
            // file already fetched
            return;
          }
          const dataURI = parseSprite(await getGameFile(filePath));
          if (dataURI == null) {
            console.warn(
              `Could not convert sprite file to data URI for item code "${itemCode}".`,
            );
            return;
          }
          gameFiles[filePath] = dataURI;
        } catch (e) {
          console.debug(
            `Could not get sprite data for item code "${itemCode}"`,
            (e as Error).stack,
          );
        }
      }

      async function extractSpriteWithAlternatives(
        itemCode: string,
        asset: string,
      ): Promise<void> {
        await extractSprite(itemCode, asset);

        // items can have alternative graphics
        const itemRow = itemCodeToItemRow[itemCode];
        if (itemRow != null) {
          const itemType = itemRow.type;
          const itemTypesRow = itemTypeToItemTypesRow[itemType];
          if (itemTypesRow != null) {
            const numGraphics = +itemTypesRow.VarInvGfx;
            if (numGraphics > 0) {
              for (let i = 1; i <= numGraphics; i++) {
                await extractSprite(itemCode, asset + i);
              }
            }
          }
        }
      }

      for (const entry of gameFiles['hd/items/items.json'] as {
        [assetID: string]: { asset: string };
      }[]) {
        for (const assetID in entry) {
          const itemCode = assetID;
          await extractSpriteWithAlternatives(itemCode, entry[assetID].asset);
        }
      }

      for (const item of gameFiles['hd/items/sets.json'] as {
        [assetID: string]: { normal: string; uber: string; ultra: string };
      }[]) {
        for (const assetID in item) {
          const itemCode = assetIDToItemCodes[assetID];
          if (itemCode != null) {
            await extractSpriteWithAlternatives(itemCode, item[assetID].normal);
            await extractSpriteWithAlternatives(itemCode, item[assetID].uber);
            await extractSpriteWithAlternatives(itemCode, item[assetID].ultra);
          }
        }
      }

      for (const item of gameFiles['hd/items/uniques.json'] as {
        [assetID: string]: { normal: string; uber: string; ultra: string };
      }[]) {
        for (const assetID in item) {
          const itemCode = assetIDToItemCodes[assetID];
          if (itemCode != null) {
            await extractSpriteWithAlternatives(itemCode, item[assetID].normal);
            await extractSpriteWithAlternatives(itemCode, item[assetID].uber);
            await extractSpriteWithAlternatives(itemCode, item[assetID].ultra);
          }
        }
      }

      if (!runtime!.options.isPreExtractedData) {
        await BridgeAPI.closeStorage();
      }

      return { characters, stashes, gameFiles };
    } finally {
      runtime = null;
    }
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

    try {
      if (!runtime.options.isDirectMode) {
        await BridgeAPI.deleteFile(
          path.join(runtime.options.mergedPath, '..'),
          'None',
        );
        await BridgeAPI.createDirectory(runtime.options.mergedPath);
        const baseSavesPath = path.resolve(getBaseSavesPath());
        const modsSavesPath = path.resolve(baseSavesPath, 'mods');
        const savesPath = getSavesPath();
        await BridgeAPI.writeJson(
          path.join(runtime.options.mergedPath, '..', 'modinfo.json'),
          'None',
          {
            name: runtime.options.outputModName,
            // use a relative path if possible - but allow an absolute path
            savepath: savesPath.startsWith(baseSavesPath)
              ? path.relative(modsSavesPath, savesPath)
              : savesPath,
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
      return modsInstalled;
    } finally {
      runtime = null;
    }
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
