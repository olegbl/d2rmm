import type { IInstallModsOptions } from 'bridge/BridgeAPI';
import BridgeAPI from 'renderer/BridgeAPI';
import { useDataPath } from 'renderer/react/context/DataPathContext';
import { useSanitizedGamePath } from 'renderer/react/context/GamePathContext';
import { useIsInstalling } from 'renderer/react/context/InstallContext';
import { useIsDirectMode } from 'renderer/react/context/IsDirectModeContext';
import { useIsPreExtractedData } from 'renderer/react/context/IsPreExtractedDataContext';
import { useLogger } from 'renderer/react/context/LogContext';
import {
  useInstalledMods,
  useModsToInstall,
} from 'renderer/react/context/ModsContext';
import { useOutputModName } from 'renderer/react/context/OutputModNameContext';
import { useOutputPath } from 'renderer/react/context/OutputPathContext';
import { usePreExtractedDataPath } from 'renderer/react/context/PreExtractedDataPathContext';
import { useTabState } from 'renderer/react/context/TabContext';
import useToast from 'renderer/react/hooks/useToast';
import { useCallback } from 'react';

export default function useInstallMods(
  isUninstall: boolean = false,
): () => void {
  const showToast = useToast();
  const dataPath = useDataPath();
  const gamePath = useSanitizedGamePath();
  const [isDirectMode] = useIsDirectMode();
  const [isPreExtractedData] = useIsPreExtractedData();
  const [preExtractedDataPath] = usePreExtractedDataPath();
  const [outputModName] = useOutputModName();
  const outputPath = useOutputPath();
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

      const options: IInstallModsOptions = {
        dataPath,
        gamePath,
        isDirectMode,
        isDryRun: isUninstall,
        isPreExtractedData,
        mergedPath: outputPath,
        outputModName,
        preExtractedDataPath,
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
    dataPath,
    gamePath,
    isDirectMode,
    isPreExtractedData,
    isUninstall,
    label,
    logger,
    modsToInstall,
    outputModName,
    outputPath,
    preExtractedDataPath,
    setInstalledMods,
    setIsInstalling,
    setTab,
    showToast,
  ]);
}
