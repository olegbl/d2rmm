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
  debug: (...args: unknown[]) => void;
  /**
   * Outputs a message to the console with the log level 'info'.
   * @param args - The data to log.
   */
  log: (...args: unknown[]) => void;
  /**
   * Outputs a message to the console with the log level 'warn'.
   * @param args - The data to log.
   */
  warn: (...args: unknown[]) => void;
  /**
   * Outputs a message to the console with the log level 'error'.
   * @param args - The data to log.
   */
  error: (...args: unknown[]) => void;
}
