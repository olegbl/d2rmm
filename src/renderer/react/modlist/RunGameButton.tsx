import BridgeAPI from 'renderer/BridgeAPI';
import { useSanitizedGamePath } from 'renderer/react/context/GamePathContext';
import { useInstallBeforeRun } from 'renderer/react/context/InstallBeforeRunContext';
import { useIsInstallConfigChanged } from 'renderer/react/context/ModsContext';
import useAsyncCallback from 'renderer/react/hooks/useAsyncCallback';
import useGameLaunchArgs from 'renderer/react/hooks/useGameLaunchArgs';
import useInstallMods from 'renderer/react/modlist/hooks/useInstallMods';
import { useMemo } from 'react';
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

  const gamePath = useSanitizedGamePath();
  const args = useGameLaunchArgs();
  const command = useMemo(() => ['D2R.exe'].concat(args).join(' '), [args]);

  const [isInstallBeforeRunEnabled] = useInstallBeforeRun();

  const onInstallMods = useInstallMods();

  const onPress = useAsyncCallback(async () => {
    if (isInstallBeforeRunEnabled) {
      await onInstallMods();
    }
    await BridgeAPI.execute(`${gamePath}\\D2R.exe`, args);
  }, [isInstallBeforeRunEnabled, onInstallMods, args, gamePath]);

  return (
    <Tooltip
      title={`Run Diablo II: Resurrected by launching "${command}".${warning}`}
    >
      <Button
        onClick={onPress}
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
