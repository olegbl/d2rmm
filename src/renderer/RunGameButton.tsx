import { useCallback, useMemo } from 'react';
import {
  PlayCircleFilled,
  PlayCircleOutlineOutlined,
} from '@mui/icons-material';
import { Button, Tooltip } from '@mui/material';
import BridgeAPI from './BridgeAPI';
import { useIsInstallConfigChanged } from './ModsContext';
import { usePreferences } from './Preferences';
import useGameArgs from './useGameArgs';

type Props = Record<string, never>;

export default function RunGameButton(_props: Props): JSX.Element {
  const isInstallConfigChanged = useIsInstallConfigChanged();
  const warning = isInstallConfigChanged
    ? ' Install configuration has changed. Are you sure you want to run the game without triggering "Install Mods" first?'
    : '';

  const { gamePath } = usePreferences();
  const args = useGameArgs();
  const command = useMemo(() => ['D2R.exe'].concat(args).join(' '), [args]);

  const onRunGame = useCallback(() => {
    BridgeAPI.execute(`${gamePath}\\D2R.exe`, args).catch(console.error);
  }, [args, gamePath]);

  return (
    <Tooltip
      title={`Run Diablo II: Resurrected by launching "${command}".${warning}`}
    >
      <Button
        startIcon={
          !isInstallConfigChanged ? (
            <PlayCircleFilled />
          ) : (
            <PlayCircleOutlineOutlined />
          )
        }
        onClick={onRunGame}
        variant={!isInstallConfigChanged ? 'contained' : 'outlined'}
      >
        Run D2R
      </Button>
    </Tooltip>
  );
}
