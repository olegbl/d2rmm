import BridgeAPI from 'renderer/BridgeAPI';
import { useEventAPIListener } from 'renderer/EventAPI';
import { useCallback, useEffect, useState } from 'react';

// True while a D2RMM-launched game is running. Seeded once, then kept in sync
// via the worker's 'gameRunningChanged' broadcast.
export default function useIsGameRunning(): boolean {
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    BridgeAPI.isGameRunning()
      .then((running) => {
        if (!cancelled) {
          setIsRunning(running);
        }
        return running;
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, []);

  const listener = useCallback((running: boolean) => {
    setIsRunning(running);
  }, []);
  useEventAPIListener<[boolean]>('gameRunningChanged', listener);

  return isRunning;
}
