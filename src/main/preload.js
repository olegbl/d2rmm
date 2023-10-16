const { contextBridge, ipcRenderer, shell } = require('electron');
const json5 = require('json5');

const listeners = [];
const consoleMethods = ['debug', 'log', 'warn', 'error'];
consoleMethods.forEach((level) => {
  const original = console[level];
  const replacement = (...args) => {
    original(...args);
    listeners.forEach((listener) => listener(level, args));
  };
  console[level] = replacement;
});

function addConsoleListener(callback) {
  listeners.push(callback);
}

function removeConsoleListener(callback) {
  const index = listeners.indexOf(callback);
  if (index !== -1) {
    listeners.splice(index, 1);
  }
}

ipcRenderer.on('console', (_event, [level, args]) => {
  console[level](...args);
});

contextBridge.exposeInMainWorld('electron', {
  console,
  API: {
    addConsoleListener,
    removeConsoleListener,
    getVersion: () => {
      console.debug('ContextBridgeAPI.getVersion');
      return ipcRenderer.sendSync('getVersion');
    },
    getAppPath: () => {
      console.debug('ContextBridgeAPI.getAppPath');
      return ipcRenderer.sendSync('getAppPath');
    },
    execute: (executablePath, args, sync = false) => {
      console.debug('ContextBridgeAPI.execute', { executablePath, args, sync });
      const result = ipcRenderer.sendSync('execute', [
        executablePath,
        args,
        sync,
      ]);
      if (result instanceof Error) {
        console.error('API.execute', result);
        throw result;
      }
      return null;
    },
    openStorage: (gamePath) => {
      console.debug('ContextBridgeAPI.openStorage', { gamePath });
      const result = ipcRenderer.sendSync('openStorage', [gamePath]);
      if (result instanceof Error) {
        console.error('API.openStorage', result);
        throw result;
      }
      return null;
    },
    closeStorage: () => {
      console.debug('ContextBridgeAPI.closeStorage');
      const result = ipcRenderer.sendSync('closeStorage');
      if (result instanceof Error) {
        console.error('API.closeStorage', result);
        throw result;
      }
      return null;
    },
    extractFile: (gamePath, filePath, targetPath) => {
      console.debug('ContextBridgeAPI.extractFile', {
        gamePath,
        filePath,
        targetPath,
      });
      const result = ipcRenderer.sendSync('extractFile', [
        gamePath,
        filePath,
        targetPath,
      ]);
      if (result instanceof Error) {
        console.error('API.extractFile', result);
        throw result;
      }
      return null;
    },
    openURL: (url) => {
      console.debug('ContextBridgeAPI.openURL', url);
      shell.openExternal(url);
    },
    readModInfo: (id) => {
      const filePath = `mods\\${id}\\mod.json`;
      console.debug('ContextBridgeAPI.readModInfo', { id, filePath });
      const result = ipcRenderer.sendSync('readFile', [filePath, true]);

      if (result instanceof Error) {
        console.error('API.readModInfo', result);
        throw result;
      }

      if (result != null) {
        return {
          name: id,
          ...JSON.parse(result),
        };
      }

      return null;
    },
    readModConfig: (id) => {
      const filePath = `mods\\${id}\\config.json`;
      console.debug('ContextBridgeAPI.readModConfig', { id, filePath });
      const result = ipcRenderer.sendSync('readFile', [filePath, true]);

      if (result instanceof Error) {
        console.error('API.readModConfig', result);
        throw result;
      }

      if (result != null) {
        return JSON.parse(result);
      }
      return null;
    },
    writeModConfig: (id, value) => {
      const filePath = `mods\\${id}\\config.json`;
      console.debug('ContextBridgeAPI.writeModConfig', { id, filePath });
      const result = ipcRenderer.sendSync('writeFile', [
        filePath,
        true,
        JSON.stringify(value),
      ]);

      if (result instanceof Error) {
        console.error('API.writeModConfig', result);
        throw result;
      }

      return null;
    },
    readModCode: (id) => {
      const filePath = `mods\\${id}\\mod.js`;
      console.debug('ContextBridgeAPI.readMod', { id, filePath });
      const result = ipcRenderer.sendSync('readFile', [filePath, true]);

      if (result instanceof Error) {
        console.error('API.readMod', result);
        throw result;
      }

      return result;
    },
    readModDirectory: (filePath) => {
      console.debug('ContextBridgeAPI.readModDirectory');
      const result = ipcRenderer.sendSync('readModDirectory', [filePath]) ?? [];

      if (result instanceof Error) {
        console.error('API.readModDirectory', result);
        throw result;
      }

      return result;
    },
    readDirectory: (filePath) => {
      console.debug('ContextBridgeAPI.readDirectory');
      const result = ipcRenderer.sendSync('readDirectory', [filePath]) ?? [];

      if (result instanceof Error) {
        console.error('API.readDirectory', result);
        throw result;
      }

      return result;
    },
    createDirectory: (filePath) => {
      console.debug('ContextBridgeAPI.createDirectory');
      const result = ipcRenderer.sendSync('createDirectory', [filePath]);

      if (result instanceof Error) {
        console.error('API.createDirectory', result);
        throw result;
      }

      return result;
    },
    deleteFile: (filePath) => {
      console.debug('ContextBridgeAPI.deleteFile');
      const result = ipcRenderer.sendSync('deleteFile', [filePath, false]);

      if (result instanceof Error) {
        console.error('API.deleteFile', result);
        throw result;
      }

      return result;
    },
    copyFile: (fromPath, toPath, overwrite = false) => {
      console.debug('ContextBridgeAPI.copyFile', {
        fromPath,
        toPath,
        overwrite,
      });
      const result = ipcRenderer.sendSync('copyFile', [
        fromPath,
        toPath,
        overwrite,
      ]);

      if (result instanceof Error) {
        console.error('API.copyFile', result);
        throw result;
      }

      return result;
    },
    readTsv: (filePath) => {
      console.debug('ContextBridgeAPI.readTsv', { filePath });
      const result = ipcRenderer.sendSync('readFile', [filePath, false]);

      if (result instanceof Error) {
        console.error('API.readTsv', result);
        throw result;
      }

      if (result == null) {
        console.warn('API.readTsv', 'file not found');
        return null;
      }

      const [headersRaw, ...rowsRaw] = result.split('\n');
      const headers = headersRaw.split('\t');
      const rows = rowsRaw
        .map((row) => {
          if (row === '') {
            return null;
          }
          const rowRaw = row.split('\t');
          return rowRaw.reduce((agg, value, index) => {
            agg[headers[index]] = value;
            return agg;
          }, {});
        })
        .filter(Boolean);
      return { headers, rows };
    },
    writeTsv: (filePath, data) => {
      console.debug('ContextBridgeAPI.writeTsv', { filePath, data });
      const { headers, rows } = data;
      const headersRaw = headers.join('\t');
      const rowsRaw = rows.map((row) =>
        headers.map((header) => row[header] ?? '').join('\t')
      );
      const content = [headersRaw, ...rowsRaw, ''].join('\n');
      const result = ipcRenderer.sendSync('writeFile', [
        filePath,
        false,
        content,
      ]);

      if (result instanceof Error) {
        console.error('API.writeTsv', result);
        throw result;
      }

      return result;
    },
    readJson: (filePath) => {
      console.debug('ContextBridgeAPI.readJson', { filePath });
      const result = ipcRenderer.sendSync('readFile', [filePath, false]);

      if (result instanceof Error) {
        console.error('API.readTxt', result);
        throw result;
      }

      if (result == null) {
        console.warn('API.readJson', 'file not found');
        return {};
      }

      const cleanContent = result
        // remove byte order mark
        .replace(/^\uFEFF/, '');
      try {
        return json5.parse(cleanContent);
      } catch (e) {
        console.error('API.readJson', e, { result, cleanContent });
        throw e;
      }
    },
    writeJson: (filePath, data) => {
      console.debug('ContextBridgeAPI.writeJson', { filePath, data });
      const content = JSON.stringify(data); // we don't use json5 here so that keys are still wrapped in quotes
      const result = ipcRenderer.sendSync('writeFile', [
        filePath,
        false,
        // add byte order mark (not every vanilla file has one but D2R doesn't seem to mind when it's added)
        `\uFEFF${content}`,
      ]);

      if (result instanceof Error) {
        console.error('API.writeJson', result);
        throw result;
      }

      return result;
    },
    readTxt: (filePath) => {
      console.debug('ContextBridgeAPI.readTxt', { filePath });
      const result = ipcRenderer.sendSync('readFile', [filePath, false]);

      if (result instanceof Error) {
        console.error('API.readTxt', result);
        throw result;
      }

      if (result == null) {
        console.warn('API.readTxt', 'file not found');
        return null;
      }

      return result;
    },
    writeTxt: (filePath, data) => {
      console.debug('ContextBridgeAPI.writeTxt', { filePath, data });
      const result = ipcRenderer.sendSync('writeFile', [filePath, false, data]);

      if (result instanceof Error) {
        console.error('API.writeTxt', result);
        throw result;
      }

      return result;
    },
  },
});
