import type { JSONData } from 'bridge/JSON';
import type { ModAPI } from 'bridge/ModAPI';
import type { TSVData } from 'bridge/TSV';
import { InstallationRuntime } from './InstallationRuntime';
import { QuickJSContext, QuickJSHandle, Scope } from 'quickjs-emscripten';

let nextStringIDRaw: string | null = null;
let nextStringID: number = 0;

function throwIfError<T>(value: T | Error): T {
  if (value instanceof Error) {
    throw value;
  }
  return value;
}

export function getModAPI(
  vm: QuickJSContext,
  scope: Scope,
  runtime: InstallationRuntime
): QuickJSHandle {
  function extractFile(filePath: string): void {
    // if file is already exists (was creating during this installation), don't need to extract it again
    if (runtime.fileManager.exists(filePath)) {
      return;
    }

    // if we're using direct mode, then we want to delete any existing file
    // and extract it during the very first time we use it so that we're
    // always applying to clean vanilla data rather than the output of a
    // previous installation
    if (runtime.options.isDirectMode) {
      throwIfError(
        runtime.BridgeAPI.deleteFile(
          runtime.getDestinationFilePath(filePath),
          'None'
        )
      );
    }

    if (runtime.options.isPreExtractedData) {
      const success = throwIfError(
        runtime.BridgeAPI.copyFile(
          runtime.getPreExtractedSourceFilePath(filePath),
          runtime.getDestinationFilePath(filePath),
          false // don't overwrite if it already exists
        )
      );
      if (success === 2) {
        throw new Error(
          `file "${runtime.getPreExtractedSourceFilePath(
            filePath
          )}" was not found`
        );
      }
    } else {
      throwIfError(
        runtime.BridgeAPI.extractFile(
          filePath,
          runtime.getDestinationFilePath(filePath)
        )
      );
    }
    runtime.fileManager.extract(filePath, runtime.mod.id);
  }

  const api: ModAPI = {
    getConfigJSON: (): string => {
      console.debug('D2RMM.getConfigJSON');
      return JSON.stringify(runtime.mod.config);
    },
    getVersion: (): number => {
      console.debug('D2RMM.getVersion');
      const [major, minor] = throwIfError(runtime.BridgeAPI.getVersion());
      return parseFloat(`${major}.${minor}`);
    },
    getFullVersion: (): [number, number, number] => {
      console.debug('D2RMM.getFullVersion');
      return throwIfError(runtime.BridgeAPI.getVersion());
    },
    getModList: () => {
      console.debug('D2RMM.getModList');

      return runtime.modsToInstall.map((mod) => ({
        id: mod.id,
        name: mod.info.name,
        version: mod.info.version,
        installed: runtime.modsInstalled.includes(mod.id),
        config: mod.config,
      }));
    },
    error: (message: string | Error): void => {
      if (message instanceof Error) {
        throw message;
      }
      throw new Error(message);
    },
    readTsv: (filePath: string): TSVData => {
      console.debug('D2RMM.readTsv', filePath);
      extractFile(filePath);
      const result = throwIfError(
        runtime.BridgeAPI.readTsv(runtime.getDestinationFilePath(filePath))
      );
      runtime.fileManager.read(filePath, runtime.mod.id);
      return result;
    },
    writeTsv: (filePath: string, data: TSVData): void => {
      console.debug('D2RMM.writeTsv', filePath, data);
      if (!runtime.options.isDryRun) {
        throwIfError(
          runtime.BridgeAPI.writeTsv(
            runtime.getDestinationFilePath(filePath),
            data
          )
        );
        runtime.fileManager.write(filePath, runtime.mod.id);
      }
    },
    readJson: (filePath: string): JSONData => {
      console.debug('D2RMM.readJson', filePath);
      extractFile(filePath);
      const result = throwIfError(
        runtime.BridgeAPI.readJson(runtime.getDestinationFilePath(filePath))
      );
      runtime.fileManager.read(filePath, runtime.mod.id);
      return result;
    },
    writeJson: (filePath: string, data: JSONData): void => {
      console.debug('D2RMM.writeJson', filePath, data);
      if (!runtime.options.isDryRun) {
        throwIfError(
          runtime.BridgeAPI.writeJson(
            runtime.getDestinationFilePath(filePath),
            data
          )
        );
        runtime.fileManager.write(filePath, runtime.mod.id);
      }
    },
    copyFile: (src: string, dst: string, overwrite = false): void => {
      console.debug('D2RMM.copyFile', src, dst);
      if (!runtime.options.isDryRun) {
        const copiedFiles: CopiedFile[] = [];
        throwIfError(
          runtime.BridgeAPI.copyFile(
            runtime.getModSourceFilePath(src),
            runtime.getDestinationFilePath(dst),
            overwrite,
            copiedFiles
          )
        );
        copiedFiles.forEach(({ toPath }) => {
          runtime.fileManager.write(
            runtime.getRelativeFilePathFromDestinationFilePath(toPath),
            runtime.mod.id
          );
        });
      }
    },
    readTxt: (filePath: string): string => {
      console.debug('D2RMM.readTxt', filePath);
      extractFile(filePath);
      const result = throwIfError(
        runtime.BridgeAPI.readTxt(runtime.getDestinationFilePath(filePath))
      );
      runtime.fileManager.read(filePath, runtime.mod.id);
      return result;
    },
    writeTxt: (filePath: string, data: string): void => {
      console.debug('D2RMM.writeTxt', filePath, data);
      if (!runtime.options.isDryRun) {
        throwIfError(
          runtime.BridgeAPI.writeTxt(
            runtime.getDestinationFilePath(filePath),
            data
          )
        );
        runtime.fileManager.write(filePath, runtime.mod.id);
      }
    },
    readSaveFile: (filePath: string): Buffer | null => {
      console.debug('D2RMM.readSaveFile', filePath);
      const result = throwIfError(
        runtime.BridgeAPI.readBinaryFile(filePath, 'Saves')
      );
      runtime.fileManager.read(filePath, runtime.mod.id);
      return result;
    },
    writeSaveFile: (filePath: string, data: Buffer): void => {
      console.debug('D2RMM.writeSaveFile', filePath, data);
      if (!runtime.options.isDryRun) {
        throwIfError(
          runtime.BridgeAPI.writeBinaryFile(filePath, 'Saves', data)
        );
        runtime.fileManager.write(filePath, runtime.mod.id);
      }
    },
    getNextStringID: (): number => {
      console.debug('D2RMM.getNextStringID');

      const filePath = 'local\\lng\\next_string_id.txt';

      if (nextStringIDRaw == null) {
        extractFile(filePath);
        nextStringIDRaw = throwIfError(
          runtime.BridgeAPI.readTxt(runtime.getDestinationFilePath(filePath))
        );
        nextStringID = parseInt(
          nextStringIDRaw?.match(/[0-9]+/)?.[0] ?? '0',
          10
        );
      }
      runtime.fileManager.read(filePath, runtime.mod.id);

      const stringID = nextStringID;
      nextStringID = nextStringID + 1;

      if (nextStringIDRaw != null) {
        if (!runtime.options.isDryRun) {
          throwIfError(
            runtime.BridgeAPI.writeTxt(
              runtime.getDestinationFilePath(filePath),
              nextStringIDRaw.replace(/[0-9]+/, String(nextStringID))
            )
          );
        }
      }

      runtime.fileManager.write(filePath, runtime.mod.id);

      return stringID;
    },
  };

  const apiHandle = scope.manage(vm.newObject());

  for (const key in api) {
    const name = key as keyof ModAPI;
    addAPIProxy(vm, scope, apiHandle, api, name);
  }

  return apiHandle;
}

function addAPIProxy<T extends keyof ModAPI>(
  vm: QuickJSContext,
  scope: Scope,
  handle: QuickJSHandle,
  api: ModAPI,
  name: T
): void {
  vm.setProp(
    handle,
    name,
    scope.manage(
      vm.newFunction(name, (...args) =>
        getHandleForValue(
          vm,
          scope,
          (api[name] as Function)(...args.map(vm.dump))
        )
      )
    )
  );
}

function getHandleForValue<T>(
  vm: QuickJSContext,
  scope: Scope,
  value: T
): QuickJSHandle {
  if (value instanceof Error) {
    return scope.manage(vm.newError(value.message));
  } else if (typeof value === 'boolean') {
    // vm.newBoolean doesn't exist - but numbers can be used as booleans in JS
    return scope.manage(vm.newNumber(value ? 1 : 0));
  } else if (typeof value === 'number') {
    return scope.manage(vm.newNumber(value));
  } else if (typeof value === 'string') {
    return scope.manage(vm.newString(value));
  } else if (value instanceof Buffer) {
    return scope.manage(vm.newArrayBuffer(value));
  } else if (Array.isArray(value)) {
    const arrayHandle = scope.manage(vm.newArray());
    for (let i = 0; i < value.length; i++) {
      vm.setProp(arrayHandle, i, getHandleForValue(vm, scope, value[i]));
    }
    return arrayHandle;
  } else if (typeof value === 'object' && value !== null) {
    const objectHandle = scope.manage(vm.newObject());
    for (const key in value) {
      vm.setProp(objectHandle, key, getHandleForValue(vm, scope, value[key]));
    }
    return objectHandle;
  } else {
    return vm.undefined;
  }
}
