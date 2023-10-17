import { useCallback, useMemo } from 'react';
import { LoadingButton } from '@mui/lab';
import { Tooltip } from '@mui/material';
import useToast from './useToast';
import { usePreferences } from './Preferences';
import { useLogger } from './Logs';
import { useEnabledMods } from './ModsContext';

const BridgeAPI = window.electron.BridgeAPI;

type Props = {
  isUninstall?: boolean;
  onErrorsEncountered: () => unknown;
  orderedMods: Mod[];
  tooltip?: string | null;
};

export default function ModInstallButton({
  isUninstall = false,
  onErrorsEncountered,
  orderedMods,
  tooltip,
}: Props): JSX.Element {
  const showToast = useToast();
  const preferences = usePreferences();
  const logger = useLogger();
  const [enabledMods] = useEnabledMods();

  const modsToInstall = useMemo(
    () => orderedMods.filter((mod) => enabledMods[mod.id] ?? false),
    [orderedMods, enabledMods]
  );

  const label = isUninstall ? 'Uninstall' : 'Install';

  const onInstallMods = useCallback((): void => {
    try {
      logger.clear();

      const options = {
        dataPath: preferences.dataPath,
        extraArgs: preferences.extraArgs,
        gamePath: preferences.gamePath,
        isDirectMode: preferences.isDirectMode,
        isDryRun: isUninstall,
        isPreExtractedData: preferences.isPreExtractedData,
        mergedPath: preferences.mergedPath,
        preExtractedDataPath: preferences.preExtractedDataPath,
        rawGamePath: preferences.rawGamePath,
      };

      console.debug(`Installing mods...`, options);
      const modsInstalled = BridgeAPI.installMods(modsToInstall, options);

      if (modsToInstall.length === 0) {
        showToast({
          severity: 'success',
          title: `No Mods ${label}ed`,
        });
      } else if (modsInstalled.length > 0) {
        showToast({
          severity:
            modsInstalled.length < modsToInstall.length ? 'warning' : 'success',
          title: `${modsInstalled.length}/${modsToInstall.length} Mods ${label}ed`,
        });
      }

      if (modsInstalled.length < modsToInstall.length) {
        onErrorsEncountered();
      }
    } catch (error) {
      console.error(String(error));
      showToast({
        severity: 'error',
        title: `Error When ${label}ing Mods`,
        description: String(error),
      });
      onErrorsEncountered();
    }
  }, [
    isUninstall,
    label,
    logger,
    modsToInstall,
    onErrorsEncountered,
    preferences,
    showToast,
  ]);

  const button = (
    <LoadingButton onClick={onInstallMods} variant="outlined">
      {label} Mods
    </LoadingButton>
  );

  if (tooltip != null) {
    return <Tooltip title={tooltip}>{button}</Tooltip>;
  }

  return button;
}
