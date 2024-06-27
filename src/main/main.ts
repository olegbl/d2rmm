/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import 'core-js/stable';
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import log from 'electron-log/main';
import path from 'path';
import 'regenerator-runtime/runtime';
import type { IRendererIPCAPI } from 'bridge/RendererIPCAPI';
import { initAppInfoAPI } from './AppInfoAPI';
import { initBroadcastAPI } from './BroadcastAPI';
import { initConsoleAPI } from './ConsoleAPI';
import { consumeAPI, initIPC } from './IPC';
import { RendererIPCAPI } from './RendererIPCAPI';
import { initRequestAPI } from './RequestAPI';
import { initShellAPI } from './ShellAPI';
import { initUpdateInstallerAPI } from './UpdateInstallerAPI';
import { getWorkers, spawnNewWorker } from './Workers';
import { initPreferences } from './preferences';
import { resolveHtmlPath } from './util';
import { CURRENT_VERSION } from './version';

log.initialize();
log.transports.file.resolvePathFn = () =>
  path.join(
    app.isPackaged
      ? path.join(process.resourcesPath, '../')
      : path.join(__dirname, '../../'),
    'd2rmm.log',
  );
Object.assign(console, log.functions);

console.log('[main] Starting D2RMM...');

let mainWindow: BrowserWindow | null = null;
if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDevelopment =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDevelopment) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  console.debug('[main] Initializing...');
  if (isDevelopment) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });
  mainWindow.setTitle(
    `[D2RMM] Diablo II: Resurrected Mod Manager ${CURRENT_VERSION}`,
  );
  mainWindow.removeMenu();

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open urls in the user's browser
  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url).catch(console.error);
  });

  console.debug('[main] Initializing IPC...');
  await initIPC(mainWindow);
  console.debug('[main] Initializing BroadcastAPI...');
  await initBroadcastAPI();
  console.debug('[main] Initializing ConsoleAPI...');
  await initConsoleAPI();
  console.debug('[main] Initializing AppInfoAPI...');
  await initAppInfoAPI();
  console.debug('[main] Initializing ShellAPI...');
  await initShellAPI();
  console.debug('[main] Initializing RequestAPI...');
  await initRequestAPI();
  console.debug('[main] Initializing UpdateInstallerAPI...');
  await initUpdateInstallerAPI();
  console.debug('[main] Initialized');

  try {
    console.debug('[main] Spawning worker...');
    await spawnNewWorker();
    console.debug('[main] Worker spawned successfully!');
  } catch (e) {
    console.error(
      `Catastrophic failure! Failed to start worker: ${e}. You should restart D2RMM.`,
    );
    app.quit();
  }

  await mainWindow.loadURL(resolveHtmlPath('index.html'));
};

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

let isSafeToQuit = false;
app.on('before-quit', (event) => {
  if (!isSafeToQuit) {
    event.preventDefault();
    const timeoutID = setTimeout(() => {
      isSafeToQuit = true;
      app.quit();
    }, 5000);
    RendererIPCAPI.disconnect()
      .catch(console.error)
      .finally(() => {
        clearTimeout(timeoutID);
        isSafeToQuit = true;
        app.quit();
      });
    return;
  }
  getWorkers().forEach((worker) => worker.kill());
  BrowserWindow.getAllWindows().forEach((win) => win.close());
  ipcMain.removeAllListeners();
});

initPreferences();

app
  .whenReady()
  .then(() => {
    createWindow().catch(console.error);
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow().catch(console.error);
    });
  })
  .catch(console.error);
