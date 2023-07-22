import { useMemo } from 'react';
import { usePreferences } from './Preferences';

export default function useGameArgs(): string[] {
  const { isDirectMode, extraArgs } = usePreferences();

  return useMemo(() => {
    const baseArgs = isDirectMode
      ? ['-direct', '-txt']
      : ['-mod', 'D2RMM', '-txt'];
    return [
      ...baseArgs,
      ...extraArgs
        .map((arg) => arg.trim())
        .filter((arg) => !baseArgs.includes(arg)),
    ];
  }, [isDirectMode, extraArgs]);
}
