import { app } from 'electron';
import { readFileSync } from 'fs';
import path from 'path';
import {
  newQuickJSWASMModuleFromVariant,
  QuickJSWASMModule,
  newVariant,
} from 'quickjs-emscripten-core';
import releaseSyncVariant from '@jitl/quickjs-wasmfile-release-sync';

let loadedQuickJSWASMModule: QuickJSWASMModule | null;

export async function initQuickJS(): Promise<void> {
  const modulePath = path.join(
    process.resourcesPath,
    'app.asar.unpacked/node_modules',
    '@jitl/quickjs-wasmfile-release-sync/dist'
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
              path.join(modulePath, 'emscripten-module.mjs')
            )
              .toString()
              .replace(
                /import.meta.url/g,
                `"file:///${modulePath.replace(/\\/g, '/')}"`
              )
              .replace('export default ', '');
            return eval(mjsSourceCode);
          },
        },
        {
          wasmBinary: readFileSync(
            path.join(modulePath, 'emscripten-module.wasm')
          ),
        }
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
