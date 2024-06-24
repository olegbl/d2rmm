import type { ConsoleAPI, ConsoleArg } from 'bridge/ConsoleAPI';
import { consumeAPI, provideAPI } from './IPC';

export async function initConsoleAPI(): Promise<void> {
  const ConsoleAPI = consumeAPI<ConsoleAPI>('ConsoleAPI');
  const localConsole = { ...console };

  // forward console messages to the renderer process
  const consoleWrapper = { ...console };
  for (const level of ['debug', 'log', 'warn', 'error'] as const) {
    consoleWrapper[level] = (...args) => {
      // print the message to the local console
      localConsole[level](...args);
      // forward the message to other threads
      ConsoleAPI[level](...args);
    };
  }
  Object.assign(console, consoleWrapper);

  // listen for console messages from other threads
  provideAPI('ConsoleAPI', {
    debug: async (...args: ConsoleArg[]) => {
      localConsole.debug(...args);
    },
    log: async (...args: ConsoleArg[]) => {
      localConsole.log(...args);
    },
    warn: async (...args: ConsoleArg[]) => {
      localConsole.warn(...args);
    },
    error: async (...args: ConsoleArg[]) => {
      localConsole.error(...args);
    },
  } as ConsoleAPI);
}
