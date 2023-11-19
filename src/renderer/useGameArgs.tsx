import { useMemo } from 'react';
import { usePreferences } from './Preferences';

export default function useGameArgs(): string[] {
  const { extraArgs, isDirectMode, outputModName } = usePreferences();

  return useMemo(() => {
    const baseArgs: string[] = isDirectMode
      ? ['-direct', '-txt']
      : ['-mod', outputModName, '-txt'];
    return [
      ...baseArgs,
      ...extraArgs
        .map((arg) => arg.trim())
        .filter((arg) => !baseArgs.includes(arg)),
    ];
  }, [extraArgs, isDirectMode, outputModName]);
}
