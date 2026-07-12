import BridgeAPI from 'renderer/BridgeAPI';
import { useSanitizedGamePath } from 'renderer/react/context/GamePathContext';
import { useInstallBeforeRun } from 'renderer/react/context/InstallBeforeRunContext';
import { useLinuxLaunchCommand } from 'renderer/react/context/LinuxLaunchCommandContext';
import { useIsInstallConfigChanged } from 'renderer/react/context/ModsContext';
import useAsyncCallback from 'renderer/react/hooks/useAsyncCallback';
import useGameLaunchArgs from 'renderer/react/hooks/useGameLaunchArgs';
import useIsGameRunning from 'renderer/react/hooks/useIsGameRunning';
import useInstallMods from 'renderer/react/modlist/hooks/useInstallMods';
import resolvePath from 'renderer/utils/resolvePath';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PlayCircleFilled,
  PlayCircleOutlineOutlined,
} from '@mui/icons-material';
import { Button, CircularProgress, Tooltip } from '@mui/material';

type Props = Record<string, never>;

export default function RunGameButton(_props: Props): JSX.Element {
  const { t } = useTranslation();
  const isInstallConfigChanged = useIsInstallConfigChanged();

  const gamePath = useSanitizedGamePath();
  const args = useGameLaunchArgs();
  const command = useMemo(() => ['D2R.exe'].concat(args).join(' '), [args]);

  const [isInstallBeforeRunEnabled] = useInstallBeforeRun();
  const [linuxLaunchCommand] = useLinuxLaunchCommand();
  const isGameRunning = useIsGameRunning();

  const onInstallMods = useInstallMods();

  const isLinux = window.env.platform === 'linux';

  const onPress = useAsyncCallback(async () => {
    if (isInstallBeforeRunEnabled) {
      if (!(await onInstallMods())) {
        return;
      }
    }
    // Linux launches via a user-provided launcher command; {args} expands to the game args.
    if (isLinux && linuxLaunchCommand.trim() !== '') {
      const command = linuxLaunchCommand.includes('{args}')
        ? linuxLaunchCommand.replace('{args}', args.join(' '))
        : linuxLaunchCommand;
      await BridgeAPI.executeCommand(command);
      return;
    }
    const pathD2rExe = resolvePath(gamePath, 'D2R.exe');
    await BridgeAPI.execute(pathD2rExe, args);
  }, [
    isInstallBeforeRunEnabled,
    onInstallMods,
    args,
    gamePath,
    isLinux,
    linuxLaunchCommand,
  ]);

  const isLaunchCommandMissing = isLinux && linuxLaunchCommand.trim() === '';
  const isDisabled = isLaunchCommandMissing || isGameRunning;

  const tooltipText = isGameRunning
    ? t('run.tooltip.running')
    : isLaunchCommandMissing
      ? t('run.tooltip.linuxNoCommand')
      : isInstallConfigChanged
        ? `${t('run.tooltip', { command })} ${t('run.tooltip.unsaved')}`
        : t('run.tooltip', { command });

  const button = (
    <Button
      disabled={isDisabled}
      onClick={onPress}
      startIcon={
        isGameRunning ? (
          <CircularProgress color="inherit" size={16} />
        ) : !isInstallConfigChanged ? (
          <PlayCircleFilled />
        ) : (
          <PlayCircleOutlineOutlined />
        )
      }
      sx={
        isGameRunning
          ? {
              // keep the running button blue instead of the greyed-out
              // disabled look, so it's not confused with "no launch command"
              '&.Mui-disabled': {
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                opacity: 0.6,
              },
            }
          : undefined
      }
      variant={
        isGameRunning || !isInstallConfigChanged ? 'contained' : 'outlined'
      }
    >
      {t('run.button')}
    </Button>
  );

  return (
    <Tooltip title={tooltipText}>
      {isDisabled ? (
        <span style={{ display: 'inline-flex' }}>{button}</span>
      ) : (
        button
      )}
    </Tooltip>
  );
}
