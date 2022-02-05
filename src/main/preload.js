const { contextBridge, ipcRenderer, shell } = require('electron');
const json5 = require('json5');

contextBridge.exposeInMainWorld('electron', {
  API: {
    openStorage: (gamePath) => {
      console.log('API.openStorage', { gamePath });
      ipcRenderer.sendSync('openStorage', gamePath);
      return null;
    },
    closeStorage: () => {
      console.log('API.closeStorage');
      ipcRenderer.sendSync('closeStorage');
      return null;
    },
    extractFile: (gamePath, filePath, targetPath) => {
      console.log('API.extractFile', { gamePath, filePath, targetPath });
      ipcRenderer.sendSync('extractFile', [gamePath, filePath, targetPath]);
      return null;
    },
    openURL: (url) => {
      console.log('API.openURL', url);
      shell.openExternal(url);
    },
    readModInfo: (id) => {
      const filePath = `mods\\${id}\\mod.json`;
      console.log('API.readModInfo', { id, filePath });
      const info = ipcRenderer.sendSync('readFile', [filePath, true]);

      if (info != null) {
        try {
          return {
            name: id,
            ...JSON.parse(info),
          };
        } catch (e) {
          console.error('API.readModInfo', e);
        }
      }

      return null;
    },
    readModConfig: (id) => {
      const filePath = `mods\\${id}\\config.json`;
      console.log('API.readModConfig', { id, filePath });
      const config = ipcRenderer.sendSync('readFile', [filePath, true]);
      if (config != null) {
        return JSON.parse(config);
      }
      return null;
    },
    writeModConfig: (id, value) => {
      const filePath = `mods\\${id}\\config.json`;
      console.log('API.writeModConfig', { id, filePath });
      ipcRenderer.sendSync('writeFile', [
        filePath,
        true,
        JSON.stringify(value),
      ]);
      return null;
    },
    readModCode: (id) => {
      const filePath = `mods\\${id}\\mod.js`;
      console.log('API.readMod', { id, filePath });
      return ipcRenderer.sendSync('readFile', [filePath, true]);
    },
    readModDirectory: (filePath) => {
      console.log('API.readModDirectory');
      return ipcRenderer.sendSync('readModDirectory', filePath) ?? [];
    },
    readDirectory: (filePath) => {
      console.log('API.readDirectory');
      return ipcRenderer.sendSync('readDirectory', filePath) ?? [];
    },
    createDirectory: (filePath) => {
      console.log('API.createDirectory');
      return ipcRenderer.sendSync('createDirectory', filePath);
    },
    deleteFile: (filePath) => {
      console.log('API.deleteFile');
      return ipcRenderer.sendSync('deleteFile', [filePath, false]);
    },
    copyFile: (fromPath, toPath, overwrite = false) => {
      console.log('API.copyFile', { fromPath, toPath, overwrite });
      return ipcRenderer.sendSync('copyFile', [fromPath, toPath, overwrite]);
    },
    readTsv: (filePath) => {
      console.log('API.readTsv', { filePath });
      const content = ipcRenderer.sendSync('readFile', [filePath, false]);
      if (content == null) {
        console.warn('API.readTsv', 'file not found');
        return null;
      }
      const [headersRaw, ...rowsRaw] = content.split('\n');
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
      ipcRenderer.sendSync('writeFile', [filePath, false, content]);
    },
    readJson: (filePath) => {
      console.log('API.readJson', { filePath });
      const content = ipcRenderer.sendSync('readFile', [filePath, false]);
      if (content == null) {
        console.warn('API.readJson', 'file not found');
        return {};
      }
      const cleanContent = content
        // remove byte order mark
        .replace(/^\uFEFF/, '');
      try {
        return json5.parse(cleanContent);
      } catch (e) {
        console.error('API.readJson', e, { content, cleanContent });
      }
      return {};
    },
    writeJson: (filePath, data) => {
      console.log('API.writeJson', { filePath, data });
      const content = JSON.stringify(data); // we don't use json5 here so that keys are still wrapped in quotes
      ipcRenderer.sendSync('writeFile', [
        filePath,
        false,
        // add byte order mark (not every vanilla file has one but D2R doesn't seem to mind when it's added)
        `\uFEFF${content}`,
      ]);
    },
  },
});
