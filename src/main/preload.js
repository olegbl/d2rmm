const { contextBridge, ipcRenderer, shell } = require('electron');

const listeners = [];
const consoleMethods = ['debug', 'log', 'warn', 'error'];
const consoleError = console.error;
consoleMethods.forEach((level) => {
  const original = console[level];
  const replacement = (...args) => {
    try {
      original(...args);
      listeners.forEach((listener) => listener(level, args));
    } catch (e) {
      consoleError(e);
    }
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

function openURL(url) {
  return shell.openExternal(url);
}

ipcRenderer.on('console', (_event, [level, args]) => {
  console[level](...args);
});

function throwIfError(value) {
  if (value instanceof Error) {
    throw value;
  }
  return value;
}

const BridgeAPINames = [
  'closeStorage',
  'copyFile',
  'createDirectory',
  'deleteFile',
  'execute',
  'extractFile',
  'getAppPath',
  'getGamePath',
  'getVersion',
  'installMods',
  'openStorage',
  'readDirectory',
  'readJson',
  'readModCode',
  'readModConfig',
  'readModDirectory',
  'readModInfo',
  'readTsv',
  'readTxt',
  'writeJson',
  'writeModConfig',
  'writeTsv',
  'writeTxt',
];

const BridgeAPI = BridgeAPINames.reduce(
  (agg, api) => ({
    ...agg,
    [api]: (...args) =>
      throwIfError(
        ipcRenderer.sendSync(
          api,
          args.map((arg) => (arg == null ? undefined : arg))
        )
      ),
  }),
  {}
);

const RendererAPI = {
  addConsoleListener,
  openURL,
  removeConsoleListener,
};

contextBridge.exposeInMainWorld('electron', {
  BridgeAPI,
  console,
  RendererAPI,
});
