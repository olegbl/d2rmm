/**
 * Because we're passing console arguments across multiple bridges
 * between Electron main, Electron renderer, and QuickJS, we need
 * to restrict the types of the arguments to a subset that can be
 * serialized and deserialized across these boundaries.
 */
type ConsoleArg =
  | undefined
  | null
  | Error
  | boolean
  | number
  | string
  | ConsoleArg[]
  | { [key: string]: ConsoleArg };

/**
 * A console interface similar to that provided by the DOM or Node.
 * It will print to D2RMM's logs tab.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Console
 *
 * @example
 * ```
 * console.log('Hello, world!');
 * ```
 */
export interface ConsoleAPI {
  /**
   * Outputs a message to the console with the log level 'debug'.
   * @param args - The data to log.
   */
  debug: (...args: ConsoleArg[]) => void;
  /**
   * Outputs a message to the console with the log level 'info'.
   * @param args - The data to log.
   */
  log: (...args: ConsoleArg[]) => void;
  /**
   * Outputs a message to the console with the log level 'warn'.
   * @param args - The data to log.
   */
  warn: (...args: ConsoleArg[]) => void;
  /**
   * Outputs a message to the console with the log level 'error'.
   * @param args - The data to log.
   */
  error: (...args: ConsoleArg[]) => void;
}
