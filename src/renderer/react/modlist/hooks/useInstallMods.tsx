import BridgeAPI from 'renderer/BridgeAPI';
import { useIsInstalling } from 'renderer/react/context/InstallContext';
import { useLogger } from 'renderer/react/context/LogContext';
import {
  useInstalledMods,
  useModsToInstall,
} from 'renderer/react/context/ModsContext';
import { usePreferences } from 'renderer/react/context/PreferencesContext';
import { useTabState } from 'renderer/react/context/TabContext';
import useToast from 'renderer/react/hooks/useToast';
import { useCallback } from 'react';

export default function useInstallMods(
  isUninstall: boolean = false,
): () => void {
  const showToast = useToast();
  const preferences = usePreferences();
  const logger = useLogger();
  const modsToInstall = useModsToInstall();
  const [, setInstalledMods] = useInstalledMods();
  const [, setIsInstalling] = useIsInstalling();

  const label = isUninstall ? 'Uninstall' : 'Install';

  const [, setTab] = useTabState();

  return useCallback(async (): Promise<void> => {
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
}
