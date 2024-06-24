import type { ConsoleAPI } from 'bridge/ConsoleAPI';
import { getRuntime } from './BridgeAPI';
import { consumeAPI } from './worker-ipc';

// for a worker thread, the local console will print to the same place
// as the main thread's console - so we just ignore the local console
// and trust ConsoleAPI handlers for the main and renderer threads to
// take care of printing the messages to the right places
export async function initConsoleAPI(): Promise<void> {
  const ConsoleAPI = consumeAPI<ConsoleAPI>('ConsoleAPI');

  // forward console messages to the renderer process
  const consoleWrapper = { ...console };
  for (const level of ['debug', 'log', 'warn', 'error'] as const) {
    consoleWrapper[level] = (...args) => {
      const newArgs =
        getRuntime()?.isModInstalling() ?? false
          ? [`[${getRuntime()!.mod!.info.name}]`, ...args]
          : args;
      // forward the message to other threads
      ConsoleAPI[level](...newArgs);
    };
  }
  Object.assign(console, consoleWrapper);
}
