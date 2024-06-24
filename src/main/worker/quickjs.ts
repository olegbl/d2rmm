import { readFileSync } from 'fs';
import path from 'path';
import {
  QuickJSAsyncContext,
  QuickJSHandle,
  QuickJSAsyncWASMModule,
  Scope,
  newQuickJSAsyncWASMModuleFromVariant,
  newVariant,
} from 'quickjs-emscripten-core';
import releaseAsyncVariant from '@jitl/quickjs-wasmfile-release-asyncify';
import type { AsAsyncSerializableAPI, AsyncSerializableAPI } from 'bridge/API';
import { getIsPackaged, getResourcesPath } from './AppInfoAPI';

let loadedQuickJSAsyncWASMModule: QuickJSAsyncWASMModule | null;

export async function initQuickJS(): Promise<void> {
  const modulePath = path.join(
    getResourcesPath(),
    'app.asar.unpacked/node_modules',
    '@jitl/quickjs-wasmfile-release-asyncify/dist',
  );

  // issue: https://github.com/electron/asar/issues/249
  // fix: https://github.com/electron/electron/pull/37535
  // lots of blockers prevent upgrading electron & NodeJS versions :(
  const variant = getIsPackaged()
    ? newVariant(
        {
          ...releaseAsyncVariant,
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
    : releaseAsyncVariant;

  loadedQuickJSAsyncWASMModule =
    await newQuickJSAsyncWASMModuleFromVariant(variant);
}

export function getQuickJS(): QuickJSAsyncWASMModule {
  if (loadedQuickJSAsyncWASMModule == null) {
    throw new Error('QuickJS module not loaded');
  }
  return loadedQuickJSAsyncWASMModule;
}

export function getQuickJSProxyAPI<T extends AsyncSerializableAPI<T>>(
  vm: QuickJSAsyncContext,
  scope: Scope,
  api: AsAsyncSerializableAPI<T>,
): QuickJSHandle {
  const handle = scope.manage(vm.newObject());
  for (const key in api) {
    vm.setProp(
      handle,
      key,
      scope.manage(
        vm.newAsyncifiedFunction(key, async (...args) =>
          getHandleForValue(
            vm,
            scope,
            // @ts-ignore: TypeScript can't recurse deeply enough for this
            await api[key](...args.map(vm.dump)),
          ),
        ),
      ),
    );
  }
  return handle;
}

function getHandleForValue<T>(
  vm: QuickJSAsyncContext,
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
