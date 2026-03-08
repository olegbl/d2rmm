const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('IPCBridge', {
  addListener: (listener) => {
    ipcRenderer.on('ipc', listener);
    return listener;
  },
  removeListener: (listener) => {
    ipcRenderer.off('ipc', listener);
  },
  send: (data) => {
    ipcRenderer.send('ipc', data);
  },
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners();
  },
});

contextBridge.exposeInMainWorld('env', {
  platform: process.platform,
  locale:
    process.argv.find((a) => a.startsWith('--locale='))?.split('=')?.[1] ??
    null,
});

contextBridge.exposeInMainWorld('ElectronUtils', {
  getPathForFile: (file) => webUtils.getPathForFile(file),
});
