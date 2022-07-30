import { useCallback } from 'react';
import { Button } from '@mui/material';
import { usePathsContext } from './PathsContext';

const API = window.electron.API;

type Props = Record<string, never>;

export default function RunGameButton(_props: Props): JSX.Element {
  const { gamePath } = usePathsContext();

  const onRunGame = useCallback(() => {
    API.execute(`${gamePath}\\D2R.exe`, ['-mod', 'D2RMM', '-txt']);
  }, [gamePath]);

  return <Button onClick={onRunGame}>Run D2R</Button>;
}
