import { initAppInfoAPI } from './AppInfoAPI';
import { initBridgeAPI } from './BridgeAPI';
import { initCascLib } from './CascLib';
import { initConsoleAPI } from './ConsoleAPI';
import { initEventAPI } from './EventAPI';
import { initIPC } from './IPC';
import { initModUpdaterAPI } from './ModUpdaterAPI';
import { initUpdaterAPI } from './UpdaterAPI';
import { initAsar } from './asar';
import { initQuickJS } from './quickjs';

async function start(): Promise<void> {
  console.debug('[worker] Initializing...');
  console.debug('[worker] Initializing IPC...');
  await initIPC();
  console.debug('[worker] Initializing EventAPI...');
  await initEventAPI();
  console.debug('[worker] Initializing ConsoleAPI...');
  await initConsoleAPI();
  console.debug('[worker] Initializing AppInfoAPI...');
  await initAppInfoAPI();
  console.debug('[worker] Initializing Asar...');
  await initAsar();
  console.debug('[worker] Initializing QuickJS...');
  await initQuickJS();
  console.debug('[worker] Initializing CascLib...');
  await initCascLib();
  console.debug('[worker] Initializing BridgeAPI...');
  await initBridgeAPI();
  console.debug('[worker] Initializing UpdaterAPI...');
  await initUpdaterAPI();
  console.debug('[worker] Initializing ModUpdaterAPI...');
  await initModUpdaterAPI();
  console.debug('[worker] Initialized');
}

start().then().catch(console.error);
