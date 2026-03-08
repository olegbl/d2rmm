import type { ConsoleArg } from 'bridge/ConsoleAPI';
import { I18nConsoleArg, I18nError } from 'bridge/i18n';
import i18next from 'i18next';

let tEnUS: ReturnType<typeof i18next.getFixedT> | null = null;
export function getTEnUS(): ReturnType<typeof i18next.getFixedT> {
  return (tEnUS ??= i18next.getFixedT('en-US'));
}

export function isI18nConsoleArg(arg: unknown): arg is I18nConsoleArg {
  return (
    typeof arg === 'object' &&
    arg !== null &&
    '__d2rmm_i18n' in arg &&
    (arg as I18nConsoleArg).__d2rmm_i18n === true
  );
}

export function isI18nError(error: unknown): error is I18nError {
  return (
    error instanceof Error &&
    'i18nChain' in error &&
    Array.isArray((error as I18nError).i18nChain)
  );
}

/**
 * Translation utility for logging. Creates an I18nConsoleArg
 * for use as a console.log() argument.
 *
 * - Main process writes the English translation to d2rmm.log.
 * - Renderer translates to the user's locale for the Logs tab.
 * - Any extra context should follow as additional console args.
 *
 * @example
 *   console.error(tl('worker.mod.compileError'), error.stack);
 *   console.log(tl('updater.log.newVersion', { version }));
 */
export function tl(
  key: string,
  args?: Record<string, string | number> | null,
): I18nConsoleArg {
  return { __d2rmm_i18n: true, key, args: args ?? {} };
}

/**
 * Creates (or wraps) an I18nError for throwing across the IPC bridge.
 *
 * - Without `error`: creates a new error with a single-entry i18n chain.
 * - With `error`: wraps the inner error, prepending a new entry to its chain.
 *   If the inner error is an I18nError, its chain is preserved and extended.
 *
 * The full English message chain is always preserved in `error.message`
 * for d2rmm.log. The renderer translates `i18nChain` to build localized display.
 *
 * @example
 *   // simple throw
 *   throw te('worker.error.openStorage.failed', { detail });
 *
 *   // wrapping a caught error (chain grows by 1)
 *   throw te('d2s.parse.header.readFailed', null, caughtError);
 */
export function te(
  key: string,
  args?: Record<string, string | number> | null,
  error?: unknown,
): I18nError {
  const contextMessage = getTEnUS()(key, args ?? {}) as string;
  const newError = new Error(
    error == null
      ? contextMessage
      : `${contextMessage}:\n${error instanceof Error ? error.message : String(error)}`,
  ) as I18nError;
  const innerChain: ConsoleArg[] = isI18nError(error) ? error.i18nChain : [];
  newError.i18nChain = [tl(key, args), ...innerChain];
  if (error instanceof Error) {
    newError.stack = error.stack;
  }
  return newError;
}

export function localizeConsoleArgs(args: ConsoleArg[]): ConsoleArg[] {
  return args.map((arg) =>
    isI18nConsoleArg(arg)
      ? (getTEnUS()(arg.key, arg.args) as ConsoleArg)
      : isI18nError(arg)
        ? localizeConsoleArgs(arg.i18nChain)
        : arg instanceof Error
          ? arg.stack
          : arg,
  );
}
