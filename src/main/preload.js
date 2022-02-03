const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  API: {
    readModInfo: (modPath, id) => {
      const filePath = `${modPath}\\${id}\\mod.json`;
      console.log('API.readModInfo', { id, filePath });
      const info = ipcRenderer.sendSync('readFile', filePath);

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
    readModConfig: (modPath, id) => {
      const filePath = `${modPath}\\${id}\\config.json`;
      console.log('API.readModConfig', { id, filePath });
      const config = ipcRenderer.sendSync('readFile', filePath);
      if (config != null) {
        return JSON.parse(config);
      }
      return null;
    },
    writeModConfig: (modPath, id, value) => {
      const filePath = `${modPath}\\${id}\\config.json`;
      console.log('API.writeModConfig', { id, filePath });
      ipcRenderer.sendSync('writeFile', [filePath, JSON.stringify(value)]);
      return null;
    },
    readModCode: (modPath, id) => {
      const filePath = `${modPath}\\${id}\\mod.js`;
      console.log('API.readMod', { id, filePath });
      return ipcRenderer.sendSync('readFile', filePath);
    },
    readDirectory: (filePath, options = {}) => {
      console.log('API.readDirectory');
      return (ipcRenderer.sendSync('readDirectory', filePath) ?? [])
        .filter(
          ([_name, isDirectory]) =>
            (options.directoriesOnly ? isDirectory : true) &&
            (options.filesOnly ? !isDirectory : true)
        )
        .map(([name, _isDirectory]) => name);
    },
    createDirectory: (filePath) => {
      console.log('API.createDirectory');
      return ipcRenderer.sendSync('createDirectory', filePath);
    },
    deleteFile: (filePath) => {
      console.log('API.deleteFile');
      return ipcRenderer.sendSync('deleteFile', filePath);
    },
    copyFile: (fromPath, toPath, overwrite = false) => {
      console.log('API.copyFile', { fromPath, toPath, overwrite });
      return ipcRenderer.sendSync('copyFile', [fromPath, toPath, overwrite]);
    },
    readTsv: (filePath) => {
      console.log('API.readTsv', { filePath });
      const content = ipcRenderer.sendSync('readFile', filePath);
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
      ipcRenderer.sendSync('writeFile', [filePath, content]);
    },
    readJson: (filePath) => {
      console.log('API.readJson', { filePath });
      const content = ipcRenderer.sendSync('readFile', filePath);
      if (content == null) {
        console.warn('API.readJson', 'file not found');
        return {};
      }
      const cleanContent = content
        // remove non-line breaking whitespace
        .replace(/[ \t\r]+/g, '')
        // remove comments
        .split('\n')
        .map((line) => line.replace(/^(.*)\/\/.*$/, '$1'))
        .join('')
        // remove multiline comments
        .replace(/\/\*.*?\*\//, '')
        // remove trailing commas
        .replace(/,(?=\s*?[}\]])/g, '')
        // double escape escape characters
        .replace(/\\/g, '\\\\');
      try {
        return JSON.parse(cleanContent);
      } catch (e) {
        console.error('API.readJson', e, { content, cleanContent });
      }
      return {};
    },
    writeJson: (filePath, data) => {
      console.log('API.writeJson', { filePath, data });
      const content = JSON.stringify(data)
        // single escape escape characters
        .replace(/\\\\/g, '\\');
      ipcRenderer.sendSync('writeFile', [filePath, content]);
    },
  },
});
