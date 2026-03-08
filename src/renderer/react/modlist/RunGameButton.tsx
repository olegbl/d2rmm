import BridgeAPI from 'renderer/BridgeAPI';
import { useSanitizedGamePath } from 'renderer/react/context/GamePathContext';
import { useInstallBeforeRun } from 'renderer/react/context/InstallBeforeRunContext';
import { useIsInstallConfigChanged } from 'renderer/react/context/ModsContext';
import useAsyncCallback from 'renderer/react/hooks/useAsyncCallback';
import useGameLaunchArgs from 'renderer/react/hooks/useGameLaunchArgs';
import useInstallMods from 'renderer/react/modlist/hooks/useInstallMods';
import resolvePath from 'renderer/utils/resolvePath';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PlayCircleFilled,
  PlayCircleOutlineOutlined,
} from '@mui/icons-material';
import { Button, Tooltip } from '@mui/material';

type Props = Record<string, never>;

export default function RunGameButton(_props: Props): JSX.Element {
  const { t } = useTranslation();
  const isInstallConfigChanged = useIsInstallConfigChanged();

  const gamePath = useSanitizedGamePath();
  const args = useGameLaunchArgs();
  const command = useMemo(() => ['D2R.exe'].concat(args).join(' '), [args]);

  const [isInstallBeforeRunEnabled] = useInstallBeforeRun();

  const onInstallMods = useInstallMods();

  const onPress = useAsyncCallback(async () => {
    if (isInstallBeforeRunEnabled) {
      if (!(await onInstallMods())) {
        return;
      }
    }
    const pathD2rExe = resolvePath(gamePath, 'D2R.exe');
    await BridgeAPI.execute(pathD2rExe, args);
  }, [isInstallBeforeRunEnabled, onInstallMods, args, gamePath]);

  const tooltipText = isInstallConfigChanged
    ? `${t('run.tooltip', { command })} ${t('run.tooltip.unsaved')}`
    : t('run.tooltip', { command });

  return (
    <Tooltip title={tooltipText}>
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
        {t('run.button')}
      </Button>
    </Tooltip>
  );
}
