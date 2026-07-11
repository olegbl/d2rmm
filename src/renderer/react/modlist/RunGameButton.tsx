import BridgeAPI from 'renderer/BridgeAPI';
import { useSanitizedGamePath } from 'renderer/react/context/GamePathContext';
import { useInstallBeforeRun } from 'renderer/react/context/InstallBeforeRunContext';
import { useLinuxLaunchCommand } from 'renderer/react/context/LinuxLaunchCommandContext';
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
  const [linuxLaunchCommand] = useLinuxLaunchCommand();

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

  const tooltipText = isLaunchCommandMissing
    ? t('run.tooltip.linuxNoCommand')
    : isInstallConfigChanged
      ? `${t('run.tooltip', { command })} ${t('run.tooltip.unsaved')}`
      : t('run.tooltip', { command });

  const button = (
    <Button
      disabled={isLaunchCommandMissing}
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
  );

  return (
    <Tooltip title={tooltipText}>
      {/* disabled buttons swallow hover events, so wrap in a span for the
          tooltip; keep enabled buttons unwrapped so ButtonGroup styles them */}
      {isLaunchCommandMissing ? (
        <span style={{ display: 'inline-flex' }}>{button}</span>
      ) : (
        button
      )}
    </Tooltip>
  );
}
