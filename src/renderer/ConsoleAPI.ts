import type { ConsoleAPI, ConsoleArg, ILogLevel } from 'bridge/ConsoleAPI';
import { consumeAPI, provideAPI } from 'renderer/IPC';
import i18n from 'renderer/i18n';
import { isI18nArg } from 'shared/i18n-log';

export type ConsoleListener = (level: ILogLevel, args: ConsoleArg[]) => void;

const LISTENERS = new Set<ConsoleListener>();

/** Replace I18nArg markers with their translated string; all other args pass through. */
function toDisplayArgs(args: ConsoleArg[]): ConsoleArg[] {
  return args.map((a) =>
    isI18nArg(a) ? (i18n.t(a.key, a.args ?? {}) as ConsoleArg) : a,
  );
}

export async function initConsoleAPI(): Promise<void> {
  const ConsoleAPI = consumeAPI<ConsoleAPI>('ConsoleAPI', {}, true);
  const localConsole = { ...console };

  // forward console messages to other threads
  const consoleWrapper = { ...console };
  for (const level of ['debug', 'log', 'warn', 'error'] as const) {
    consoleWrapper[level] = (...args) => {
      const displayArgs = toDisplayArgs(args);
      // print the message to the local console
      localConsole[level](...displayArgs);
      // notify the listeners (Logs tab)
      LISTENERS.forEach((listener) => listener(level, displayArgs));
      // forward the message to other threads (English + I18nArg intact)
      ConsoleAPI[level](...args);
    };
  }
  Object.assign(console, consoleWrapper);

  // listen for console messages from other threads
  provideAPI(
    'ConsoleAPI',
    {
      debug: async (...args: ConsoleArg[]) => {
        const displayArgs = toDisplayArgs(args);
        localConsole.debug(...displayArgs);
        LISTENERS.forEach((listener) => listener('debug', displayArgs));
      },
      log: async (...args: ConsoleArg[]) => {
        const displayArgs = toDisplayArgs(args);
        localConsole.log(...displayArgs);
        LISTENERS.forEach((listener) => listener('log', displayArgs));
      },
      warn: async (...args: ConsoleArg[]) => {
        const displayArgs = toDisplayArgs(args);
        localConsole.warn(...displayArgs);
        LISTENERS.forEach((listener) => listener('warn', displayArgs));
      },
      error: async (...args: ConsoleArg[]) => {
        const displayArgs = toDisplayArgs(args);
        localConsole.error(...displayArgs);
        LISTENERS.forEach((listener) => listener('error', displayArgs));
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
