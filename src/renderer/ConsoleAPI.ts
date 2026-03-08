import type { ConsoleAPI, ConsoleArg, ILogLevel } from 'bridge/ConsoleAPI';
import { consumeAPI, provideAPI } from 'renderer/IPC';
import { localizeConsoleArgs } from 'shared/i18n';

export type ConsoleListener = (level: ILogLevel, args: ConsoleArg[]) => void;

const LISTENERS = new Set<ConsoleListener>();

export async function initConsoleAPI(): Promise<void> {
  const ConsoleAPI = consumeAPI<ConsoleAPI>('ConsoleAPI', {}, true);
  const localConsole = { ...console };

  // forward console messages to other threads
  const consoleWrapper = { ...console };
  for (const level of ['debug', 'log', 'warn', 'error'] as const) {
    consoleWrapper[level] = (...args) => {
      localConsole[level](...localizeConsoleArgs(args));
      // notify the listeners (Logs tab)
      LISTENERS.forEach((listener) => listener(level, args));
      // forward the message to other threads (English + I18nConsoleArg intact)
      ConsoleAPI[level](...args);
    };
  }
  Object.assign(console, consoleWrapper);

  // listen for console messages from other threads
  provideAPI(
    'ConsoleAPI',
    {
      debug: async (...args: ConsoleArg[]) => {
        localConsole.debug(...localizeConsoleArgs(args));
        LISTENERS.forEach((listener) => listener('debug', args));
      },
      log: async (...args: ConsoleArg[]) => {
        localConsole.log(...localizeConsoleArgs(args));
        LISTENERS.forEach((listener) => listener('log', args));
      },
      warn: async (...args: ConsoleArg[]) => {
        localConsole.warn(...localizeConsoleArgs(args));
        LISTENERS.forEach((listener) => listener('warn', args));
      },
      error: async (...args: ConsoleArg[]) => {
        localConsole.error(...localizeConsoleArgs(args));
        LISTENERS.forEach((listener) => listener('error', args));
      },
    } as ConsoleAPI,
    true,
  );
}

export function addConsoleListener(listener: ConsoleListener): void {
  LISTENERS.add(listener);
}

export function removeConsoleListener(listener: ConsoleListener): void {
  LISTENERS.delete(listener);
}
