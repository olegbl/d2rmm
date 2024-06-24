import { useEffect } from 'react';
import {
  ConsoleListener,
  addConsoleListener,
  removeConsoleListener,
} from './ConsoleAPI';

export function useConsoleListener(callback: ConsoleListener): void {
  useEffect(() => {
    addConsoleListener(callback);
    return () => removeConsoleListener(callback);
  }, [callback]);
}
