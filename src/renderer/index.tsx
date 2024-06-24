import { createRoot } from 'react-dom/client';
import App from './App';
import { initBroadcastAPI } from './BroadcastAPI';
import { initConsoleAPI } from './ConsoleAPI';
import { initIPC } from './renderer-ipc';

async function initUI(): Promise<void> {
  const container = document.getElementById('root');
  const root = createRoot(container!);
  root.render(<App />);
}

async function start(): Promise<void> {
  console.log('[renderer] Initializing...');
  console.log('[renderer] Initializing IPC...');
  await initIPC();
  console.log('[renderer] Initializing BroadcastAPI...');
  await initBroadcastAPI();
  console.log('[renderer] Initializing ConsoleAPI...');
  await initConsoleAPI();
  console.log('[renderer] Initializing UI...');
  await initUI();
  console.log('[renderer] Initialized');
}

start().then().catch(console.error);
