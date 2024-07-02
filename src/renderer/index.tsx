import { initConsoleAPI } from 'renderer/ConsoleAPI';
import { initEventAPI } from 'renderer/EventAPI';
import { initIPC } from 'renderer/IPC';
import App from 'renderer/react/App';
import { createRoot } from 'react-dom/client';

async function initUI(): Promise<void> {
  const container = document.getElementById('root');
  const root = createRoot(container!);
  root.render(<App />);
}

async function start(): Promise<void> {
  console.debug('[renderer] Initializing...');
  console.debug('[renderer] Initializing IPC...');
  await initIPC();
  console.debug('[renderer] Initializing EventAPI...');
  await initEventAPI();
  console.debug('[renderer] Initializing ConsoleAPI...');
  await initConsoleAPI();
  console.debug('[renderer] Initializing UI...');
  await initUI();
  console.debug('[renderer] Initialized');
}

start().then().catch(console.error);
