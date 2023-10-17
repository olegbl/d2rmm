import { useEffect } from 'react';

const RendererAPI = window.electron.RendererAPI;

const consoleMethods = ['debug', 'log', 'warn', 'error'];
consoleMethods.forEach((level) => {
  console[level as ILogLevel] = window.electron.console[level as ILogLevel];
});

type IConsoleListener = (level: ILogLevel, args: unknown[]) => void;

export function useConsoleListener(callback: IConsoleListener): void {
  useEffect(() => {
    RendererAPI.addConsoleListener(callback);
    return () => RendererAPI.removeConsoleListener(callback);
  }, [callback]);
}
