import { app } from 'electron';
import { existsSync } from 'fs';
import path from 'path';

type Method = (...args: string[]) => string;

function wrap(method: Method): Method {
  return function (...args: string[]): string {
    const result = method.call(path, ...args);

    // .wasm modules cannot be shipped inside of app.asar
    // so we ship them in app.asar.unpacked, but we need to
    // adjust the file paths that they are loaded from
    if (
      result.endsWith('.wasm') &&
      result.includes('app.asar') &&
      !result.includes('app.asar.unpacked')
    ) {
      const unpackedPath = result.replace(/app.asar/g, 'app.asar.unpacked');
      if (existsSync(unpackedPath)) {
        return unpackedPath;
      }
    }

    return result;
  };
}

if (app.isPackaged) {
  path.resolve = wrap(path.resolve);
  path.join = wrap(path.join);
  path.normalize = wrap(path.normalize);
}
