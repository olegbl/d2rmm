/**
 * Structured i18n marker produced by tl(). Passes through the IPC bridge
 * as a plain object (fits within ConsoleArg's { [key: string]: ConsoleArg }).
 *
 * - Main process (d2rmm.log): resolved to English via en-US.json interpolation
 * - Renderer process (Logs tab): resolved to the user's locale via i18next
 *
 * Any extra context (stack traces, error details, etc.) should be passed as
 * additional arguments directly to console.log/warn/error — they will appear
 * in both d2rmm.log and the Logs tab unchanged.
 */
export type I18nArg = {
  __d2rmm_i18n: true;
  key: string;
  args?: Record<string, string | number>;
};

export function isI18nArg(arg: unknown): arg is I18nArg {
  return (
    typeof arg === 'object' &&
    arg !== null &&
    '__d2rmm_i18n' in arg &&
    (arg as I18nArg).__d2rmm_i18n === true
  );
}

/**
 * Translation utility for logging. Creates an I18nArg marker
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
  args?: Record<string, string | number>,
): I18nArg {
  return { __d2rmm_i18n: true, key, args };
}

// ---------------------------------------------------------------------------
// Structured i18n errors — for thrown errors that cross the IPC bridge
// ---------------------------------------------------------------------------

/**
 * An Error subtype that carries a translation key so the renderer can display
 * a localized version of the message.  The English `error.message` is still
 * written to d2rmm.log; the renderer uses `i18nKey`/`i18nArgs` for display.
 */
export type I18nError = Error & {
  i18nKey: string;
  i18nArgs?: Record<string, string | number>;
};

export function isI18nError(error: unknown): error is I18nError {
  return (
    error instanceof Error &&
    'i18nKey' in error &&
    typeof (error as I18nError).i18nKey === 'string'
  );
}

/**
 * Creates an Error with an attached translation key.
 * The `message` is the English string written to d2rmm.log.
 */
export function createI18nError(
  message: string,
  i18nKey: string,
  i18nArgs?: Record<string, string | number>,
): I18nError {
  const error = new Error(message) as I18nError;
  error.i18nKey = i18nKey;
  error.i18nArgs = i18nArgs;
  return error;
}
