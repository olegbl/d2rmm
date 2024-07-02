import BridgeAPI from 'renderer/BridgeAPI';
import { useIsInstallConfigChanged } from 'renderer/react/context/ModsContext';
import { usePreferences } from 'renderer/react/context/PreferencesContext';
import useGameArgs from 'renderer/react/hooks/useGameArgs';
import { useCallback, useMemo } from 'react';
import {
  PlayCircleFilled,
  PlayCircleOutlineOutlined,
} from '@mui/icons-material';
import { Button, Tooltip } from '@mui/material';

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
        onClick={onRunGame}
        startIcon={
          !isInstallConfigChanged ? (
            <PlayCircleFilled />
          ) : (
            <PlayCircleOutlineOutlined />
          )
        }
        variant={!isInstallConfigChanged ? 'contained' : 'outlined'}
      >
        Run D2R
      </Button>
    </Tooltip>
  );
}
