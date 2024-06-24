import { useCallback } from 'react';
import { SaveOutlined } from '@mui/icons-material';
import Save from '@mui/icons-material/Save';
import { LoadingButton } from '@mui/lab';
import { Tooltip } from '@mui/material';
import BridgeAPI from './BridgeAPI';
import { useIsInstalling } from './InstallContext';
import { useLogger } from './Logs';
import {
  useInstalledMods,
  useIsInstallConfigChanged,
  useModsToInstall,
} from './ModsContext';
import { usePreferences } from './Preferences';
import { useTabState } from './TabContext';
import useToast from './useToast';

type Props = {
  isUninstall?: boolean;
  tooltip?: string | null;
};

export default function ModInstallButton({
  isUninstall = false,
  tooltip,
}: Props): JSX.Element {
  const showToast = useToast();
  const preferences = usePreferences();
  const logger = useLogger();
  const modsToInstall = useModsToInstall();
  const [, setInstalledMods] = useInstalledMods();
  const isInstallConfigChanged = useIsInstallConfigChanged();
  const [isInstalling, setIsInstalling] = useIsInstalling();

  const label = isUninstall ? 'Uninstall' : 'Install';

  const [, setTab] = useTabState();

  const onInstallMods = useCallback(async (): Promise<void> => {
    try {
      logger.clear();
      setIsInstalling(true);

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
      modsInstalled = await BridgeAPI.installMods(modsToInstall, options);
      setInstalledMods(
        modsToInstall.map((mod) => ({ id: mod.id, config: mod.config })),
      );
      setIsInstalling(false);

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
    } catch (error) {
      console.error(String(error));
      showToast({
        severity: 'error',
        title: `Error When ${label}ing Mods`,
        description: String(error),
      });
      // switch to the logs tab so user can see what happened
      setTab('logs');
    }
  }, [
    isUninstall,
    label,
    logger,
    modsToInstall,
    preferences.dataPath,
    preferences.extraArgs,
    preferences.gamePath,
    preferences.isDirectMode,
    preferences.isPreExtractedData,
    preferences.mergedPath,
    preferences.outputModName,
    preferences.preExtractedDataPath,
    preferences.rawGamePath,
    setInstalledMods,
    setIsInstalling,
    setTab,
    showToast,
  ]);

  const button = (
    <LoadingButton
      loading={isInstalling}
      loadingPosition="start"
      onClick={onInstallMods}
      startIcon={isInstallConfigChanged ? <Save /> : <SaveOutlined />}
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
