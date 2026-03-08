import type { ConsoleAPI, ConsoleArg } from 'bridge/ConsoleAPI';
import { isI18nArg } from '../shared/i18n-log';
import { consumeAPI, provideAPI } from './IPC';
import i18n from './i18n';

/** Replace I18nArg markers with their English text; all other args pass through. */
function toFileArgs(args: ConsoleArg[]): ConsoleArg[] {
  const tEn = i18n.getFixedT('en-US');
  return args.map((a) =>
    isI18nArg(a) ? (tEn(a.key, a.args) as ConsoleArg) : a,
  );
}

export async function initConsoleAPI(): Promise<void> {
  const ConsoleAPI = consumeAPI<ConsoleAPI>('ConsoleAPI', {}, true);
  const localConsole = { ...console };

  // forward console messages to the renderer process
  const consoleWrapper = { ...console };
  for (const level of ['debug', 'log', 'warn', 'error'] as const) {
    consoleWrapper[level] = (...args) => {
      // print English-only to local console (→ d2rmm.log)
      localConsole[level](...toFileArgs(args));
      // forward full args (including I18nArg) to renderer for translation
      ConsoleAPI[level](...args);
    };
  }
  Object.assign(console, consoleWrapper);

  // listen for console messages from other threads (worker)
  provideAPI(
    'ConsoleAPI',
    {
      debug: async (...args: ConsoleArg[]) => {
        localConsole.debug(...toFileArgs(args));
      },
      log: async (...args: ConsoleArg[]) => {
        localConsole.log(...toFileArgs(args));
      },
      warn: async (...args: ConsoleArg[]) => {
        localConsole.warn(...toFileArgs(args));
      },
      error: async (...args: ConsoleArg[]) => {
        localConsole.error(...toFileArgs(args));
      },
    } as ConsoleAPI,
    true,
  );
}
