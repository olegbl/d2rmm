/**
 * A console interface similar to that provided by the DOM or Node.
 * It will print to D2RMM's logs tab.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Console
 */
export type ConsoleAPI = {
  debug: (...args: unknown[]) => void;
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};
