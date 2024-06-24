import { initAppInfoAPI } from './AppInfoAPI';
import { initBridgeAPI } from './BridgeAPI';
import { initBroadcastAPI } from './BroadcastAPI';
import { initCascLib } from './CascLib';
import { initConsoleAPI } from './ConsoleAPI';
import { initUpdaterAPI } from './UpdaterAPI';
import { initAsar } from './asar';
import { initQuickJS } from './quickjs';
import { initIPC } from './worker-ipc';

async function start(): Promise<void> {
  console.log('[worker] Initializing...');
  console.log('[worker] Initializing IPC...');
  await initIPC();
  console.log('[worker] Initializing BroadcastAPI...');
  await initBroadcastAPI();
  console.log('[worker] Initializing ConsoleAPI...');
  await initConsoleAPI();
  console.log('[worker] Initializing AppInfoAPI...');
  await initAppInfoAPI();
  console.log('[worker] Initializing Asar...');
  await initAsar();
  console.log('[worker] Initializing QuickJS...');
  await initQuickJS();
  console.log('[worker] Initializing CascLib...');
  await initCascLib();
  console.log('[worker] Initializing BridgeAPI...');
  await initBridgeAPI();
  console.log('[worker] Initializing UpdaterAPI...');
  await initUpdaterAPI();
  console.log('[worker] Initialized');
}

start().then().catch(console.error);
