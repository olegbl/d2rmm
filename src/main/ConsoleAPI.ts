import type { ConsoleAPI, ConsoleArg } from 'bridge/ConsoleAPI';
import { localizeConsoleArgs } from '../shared/i18n';
import { consumeAPI, provideAPI } from './IPC';

export async function initConsoleAPI(): Promise<void> {
  const ConsoleAPI = consumeAPI<ConsoleAPI>('ConsoleAPI', {}, true);
  const localConsole = { ...console };

  // forward console messages to the renderer process
  const consoleWrapper = { ...console };
  for (const level of ['debug', 'log', 'warn', 'error'] as const) {
    consoleWrapper[level] = (...args) => {
      // print English localization to local console (and d2rmm.log)
      localConsole[level](...localizeConsoleArgs(args));
      // forward full args to other threads
      ConsoleAPI[level](...args);
    };
  }
  Object.assign(console, consoleWrapper);

  // listen for console messages from other threads (worker)
  provideAPI(
    'ConsoleAPI',
    {
      debug: async (...args: ConsoleArg[]) => {
        localConsole.debug(...localizeConsoleArgs(args));
      },
      log: async (...args: ConsoleArg[]) => {
        localConsole.log(...localizeConsoleArgs(args));
      },
      warn: async (...args: ConsoleArg[]) => {
        localConsole.warn(...localizeConsoleArgs(args));
      },
      error: async (...args: ConsoleArg[]) => {
        localConsole.error(...localizeConsoleArgs(args));
      },
    } as ConsoleAPI,
    true,
  );
}
