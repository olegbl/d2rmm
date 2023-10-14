const { contextBridge, ipcRenderer, shell } = require('electron');
const json5 = require('json5');

contextBridge.exposeInMainWorld('electron', {
  API: {
    getVersion: () => {
      console.log('API.getVersion');
      return ipcRenderer.sendSync('getVersion');
    },
    getAppPath: () => {
      console.log('API.getAppPath');
      return ipcRenderer.sendSync('getAppPath');
    },
    execute: (executablePath, args, sync = false) => {
      console.log('API.execute', { executablePath, args, sync });
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
      console.log('API.openStorage', { gamePath });
      const result = ipcRenderer.sendSync('openStorage', gamePath);
      if (result instanceof Error) {
        console.error('API.openStorage', result);
        throw result;
      }
      return null;
    },
    closeStorage: () => {
      console.log('API.closeStorage');
      const result = ipcRenderer.sendSync('closeStorage');
      if (result instanceof Error) {
        console.error('API.closeStorage', result);
        throw result;
      }
      return null;
    },
    extractFile: (gamePath, filePath, targetPath) => {
      console.log('API.extractFile', { gamePath, filePath, targetPath });
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
      console.log('API.openURL', url);
      shell.openExternal(url);
    },
    readModInfo: (id) => {
      const filePath = `mods\\${id}\\mod.json`;
      console.log('API.readModInfo', { id, filePath });
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
      console.log('API.readModConfig', { id, filePath });
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
      console.log('API.writeModConfig', { id, filePath });
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
      console.log('API.readMod', { id, filePath });
      const result = ipcRenderer.sendSync('readFile', [filePath, true]);

      if (result instanceof Error) {
        console.error('API.readMod', result);
        throw result;
      }

      return result;
    },
    readModDirectory: (filePath) => {
      console.log('API.readModDirectory');
      const result = ipcRenderer.sendSync('readModDirectory', filePath) ?? [];

      if (result instanceof Error) {
        console.error('API.readModDirectory', result);
        throw result;
      }

      return result;
    },
    readDirectory: (filePath) => {
      console.log('API.readDirectory');
      const result = ipcRenderer.sendSync('readDirectory', filePath) ?? [];

      if (result instanceof Error) {
        console.error('API.readDirectory', result);
        throw result;
      }

      return result;
    },
    createDirectory: (filePath) => {
      console.log('API.createDirectory');
      const result = ipcRenderer.sendSync('createDirectory', filePath);

      if (result instanceof Error) {
        console.error('API.createDirectory', result);
        throw result;
      }

      return result;
    },
    deleteFile: (filePath) => {
      console.log('API.deleteFile');
      const result = ipcRenderer.sendSync('deleteFile', [filePath, false]);

      if (result instanceof Error) {
        console.error('API.deleteFile', result);
        throw result;
      }

      return result;
    },
    copyFile: (fromPath, toPath, overwrite = false) => {
      console.log('API.copyFile', { fromPath, toPath, overwrite });
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
      console.log('API.readTsv', { filePath });
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
      console.log('API.writeTsv', { filePath, data });
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
      console.log('API.readJson', { filePath });
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
      console.log('API.writeJson', { filePath, data });
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
      console.log('API.readTxt', { filePath });
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
      console.log('API.writeTxt', { filePath, data });
      const result = ipcRenderer.sendSync('writeFile', [filePath, false, data]);

      if (result instanceof Error) {
        console.error('API.writeTxt', result);
        throw result;
      }

      return result;
    },
  },
});
