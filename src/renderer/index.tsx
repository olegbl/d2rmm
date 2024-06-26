import { createRoot } from 'react-dom/client';
import App from './App';
import { initBroadcastAPI } from './BroadcastAPI';
import { initConsoleAPI } from './ConsoleAPI';
import { initIPC } from './IPC';

async function initUI(): Promise<void> {
  const container = document.getElementById('root');
  const root = createRoot(container!);
  root.render(<App />);
}

async function start(): Promise<void> {
  console.debug('[renderer] Initializing...');
  console.debug('[renderer] Initializing IPC...');
  await initIPC();
  console.debug('[renderer] Initializing BroadcastAPI...');
  await initBroadcastAPI();
  console.debug('[renderer] Initializing ConsoleAPI...');
  await initConsoleAPI();
  console.debug('[renderer] Initializing UI...');
  await initUI();
  console.debug('[renderer] Initialized');
}

start().then().catch(console.error);
