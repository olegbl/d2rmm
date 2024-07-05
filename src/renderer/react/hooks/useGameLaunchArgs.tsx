import { useExtraGameLaunchArgs } from 'renderer/react/context/ExtraGameLaunchArgsContext';
import { useIsDirectMode } from 'renderer/react/context/IsDirectModeContext';
import { useOutputModName } from 'renderer/react/context/OutputModNameContext';
import { useMemo } from 'react';

export default function useGameLaunchArgs(): string[] {
  const [isDirectMode] = useIsDirectMode();
  const [outputModName] = useOutputModName();
  const [extraArgs] = useExtraGameLaunchArgs();

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
