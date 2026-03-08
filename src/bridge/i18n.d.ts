import type { ConsoleArg } from './ConsoleAPI';

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
export type I18nConsoleArg = {
  __d2rmm_i18n: true;
  key: string;
  args?: Record<string, string | number>;
};

/**
 * An Error subtype that carries a localized error chain so the renderer can
 * display a fully localized version of the error and its context.
 *
 * Each element of `i18nChain` is a ConsoleArg — typically an I18nConsoleArg
 * produced by tl(). The chain is ordered from outermost context to innermost
 * error (index 0 = outermost). The English `error.message` is preserved for
 * d2rmm.log; the renderer translates `i18nChain` to build the localized display.
 */
export type I18nError = Error & {
  i18nChain: ConsoleArg[];
};
