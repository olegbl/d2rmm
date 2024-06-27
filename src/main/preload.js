const { contextBridge, ipcRenderer } = require('electron');

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
