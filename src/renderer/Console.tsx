import { useEffect } from 'react';

const API = window.electron.API;

const consoleMethods = ['debug', 'log', 'warn', 'error'];
consoleMethods.forEach((level) => {
  console[level as ILogLevel] = window.electron.console[level as ILogLevel];
});

type IConsoleListener = (level: ILogLevel, args: unknown[]) => void;

export function useConsoleListener(callback: IConsoleListener): void {
  useEffect(() => {
    API.addConsoleListener(callback);
    return () => API.removeConsoleListener(callback);
  }, [callback]);
}
