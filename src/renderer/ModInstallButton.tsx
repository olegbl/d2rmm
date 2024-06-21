import { useCallback } from 'react';
import { LoadingButton } from '@mui/lab';
import { Tooltip } from '@mui/material';
import { useLogger } from './Logs';
import {
  useInstalledMods,
  useIsInstallConfigChanged,
  useModsToInstall,
} from './ModsContext';
import { usePreferences } from './Preferences';
import useToast from './useToast';

const BridgeAPI = window.electron.BridgeAPI;

type Props = {
  isUninstall?: boolean;
  onErrorsEncountered: () => unknown;
  tooltip?: string | null;
};

export default function ModInstallButton({
  isUninstall = false,
  onErrorsEncountered,
  tooltip,
}: Props): JSX.Element {
  const showToast = useToast();
  const preferences = usePreferences();
  const logger = useLogger();
  const modsToInstall = useModsToInstall();
  const [, setInstalledMods] = useInstalledMods();
  const isInstallConfigChanged = useIsInstallConfigChanged();

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
        outputModName: preferences.outputModName,
        preExtractedDataPath: preferences.preExtractedDataPath,
        rawGamePath: preferences.rawGamePath,
      };

      console.debug(`Installing mods...`, options);
      let modsInstalled = [];
      modsInstalled = BridgeAPI.installMods(modsToInstall, options);
      setInstalledMods(
        modsToInstall.map((mod) => ({ id: mod.id, config: mod.config }))
      );

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
    <LoadingButton
      onClick={onInstallMods}
      variant={isInstallConfigChanged ? 'contained' : 'outlined'}
    >
      {label} Mods
    </LoadingButton>
  );

  if (tooltip != null) {
    return <Tooltip title={tooltip}>{button}</Tooltip>;
  }

  return button;
}
