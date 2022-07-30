import { useCallback } from 'react';
import { Button } from '@mui/material';
import { usePreferences } from './Preferences';

const API = window.electron.API;

type Props = Record<string, never>;

export default function RunGameButton(_props: Props): JSX.Element {
  const { gamePath, isDirectMode } = usePreferences();

  const onRunGame = useCallback(() => {
    if (isDirectMode) {
      API.execute(`${gamePath}\\D2R.exe`, ['-direct', '-txt']);
    } else {
      API.execute(`${gamePath}\\D2R.exe`, ['-mod', 'D2RMM', '-txt']);
    }
  }, [isDirectMode, gamePath]);

  return <Button onClick={onRunGame}>Run D2R</Button>;
}
