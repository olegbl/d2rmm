import { useCallback, useMemo } from 'react';
import { Button, Tooltip } from '@mui/material';
import { usePreferences } from './Preferences';

const API = window.electron.API;

type Props = Record<string, never>;

export default function RunGameButton(_props: Props): JSX.Element {
  const { gamePath, isDirectMode } = usePreferences();

  const args = useMemo(
    () => (isDirectMode ? ['-direct', '-txt'] : ['-mod', 'D2RMM', '-txt']),
    [isDirectMode]
  );

  const command = useMemo(() => ['D2R.exe'].concat(args).join(' '), [args]);

  const onRunGame = useCallback(() => {
    API.execute(`${gamePath}\\D2R.exe`, args);
  }, [args, gamePath]);

  return (
    <Tooltip title={`Run Diablo II: Resurrected by launching "${command}".`}>
      <Button onClick={onRunGame}>Run D2R</Button>
    </Tooltip>
  );
}
