import {
  ConsoleListener,
  addConsoleListener,
  removeConsoleListener,
} from 'renderer/ConsoleAPI';
import { useEffect } from 'react';

export default function useConsoleListener(callback: ConsoleListener): void {
  useEffect(() => {
    addConsoleListener(callback);
    return () => removeConsoleListener(callback);
  }, [callback]);
}
