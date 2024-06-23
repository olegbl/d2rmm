import { app } from 'electron';
import { readFileSync } from 'fs';
import path from 'path';
import {
  QuickJSContext,
  QuickJSHandle,
  QuickJSWASMModule,
  Scope,
  newQuickJSWASMModuleFromVariant,
  newVariant,
} from 'quickjs-emscripten-core';
import releaseSyncVariant from '@jitl/quickjs-wasmfile-release-sync';

let loadedQuickJSWASMModule: QuickJSWASMModule | null;

export async function initQuickJS(): Promise<void> {
  const modulePath = path.join(
    process.resourcesPath,
    'app.asar.unpacked/node_modules',
    '@jitl/quickjs-wasmfile-release-sync/dist',
  );

  // issue: https://github.com/electron/asar/issues/249
  // fix: https://github.com/electron/electron/pull/37535
  // lots of blockers prevent upgrading electron & NodeJS versions :(
  const variant = app.isPackaged
    ? newVariant(
        {
          ...releaseSyncVariant,
          importModuleLoader: () => {
            const mjsSourceCode = readFileSync(
              path.join(modulePath, 'emscripten-module.mjs'),
            )
              .toString()
              .replace(
                /import.meta.url/g,
                `"file:///${modulePath.replace(/\\/g, '/')}"`,
              )
              .replace('export default ', '');
            return eval(mjsSourceCode);
          },
        },
        {
          wasmBinary: readFileSync(
            path.join(modulePath, 'emscripten-module.wasm'),
          ),
        },
      )
    : releaseSyncVariant;

  loadedQuickJSWASMModule = await newQuickJSWASMModuleFromVariant(variant);
}

export function getQuickJS(): QuickJSWASMModule {
  if (loadedQuickJSWASMModule == null) {
    throw new Error('QuickJS module not loaded');
  }
  return loadedQuickJSWASMModule;
}

type SerializableType =
  | undefined
  | null
  | Error
  | boolean
  | number
  | string
  | SerializableType[]
  | { [key: string]: SerializableType };

type SerializableAPI<T> = {
  [K in keyof T as T[K] extends (...args: infer TArgs) => unknown
    ? TArgs extends SerializableType[]
      ? T[K] extends (...args: TArgs) => SerializableType
        ? K
        : ((...args: TArgs) => void) extends T[K]
          ? K
          : never
      : never
    : never]: T[K];
};

type AsSerializableAPI<T> =
  T extends SerializableAPI<T>
    ? SerializableAPI<T> extends T
      ? T
      : never
    : never;

export function getQuicKJSProxyAPI<T extends SerializableAPI<T>>(
  vm: QuickJSContext,
  scope: Scope,
  api: AsSerializableAPI<T>,
): QuickJSHandle {
  const handle = scope.manage(vm.newObject());
  for (const key in api) {
    vm.setProp(
      handle,
      key,
      scope.manage(
        vm.newFunction(key, (...args) =>
          getHandleForValue(vm, scope, api[key](...args.map(vm.dump))),
        ),
      ),
    );
  }
  return handle;
}

function getHandleForValue<T>(
  vm: QuickJSContext,
  scope: Scope,
  value: T,
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
