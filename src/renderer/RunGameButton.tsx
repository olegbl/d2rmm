import { useCallback, useMemo } from 'react';
import { Button, Tooltip } from '@mui/material';
import { usePreferences } from './Preferences';
import useGameArgs from './useGameArgs';

const BridgeAPI = window.electron.BridgeAPI;

type Props = Record<string, never>;

export default function RunGameButton(_props: Props): JSX.Element {
  const { gamePath } = usePreferences();
  const args = useGameArgs();

  const command = useMemo(() => ['D2R.exe'].concat(args).join(' '), [args]);

  const onRunGame = useCallback(() => {
    BridgeAPI.execute(`${gamePath}\\D2R.exe`, args);
  }, [args, gamePath]);

  return (
    <Tooltip title={`Run Diablo II: Resurrected by launching "${command}".`}>
      <Button onClick={onRunGame}>Run D2R</Button>
    </Tooltip>
  );
}
