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
import { useFinalSavesPath } from 'renderer/react/context/SavesPathContext';
import { useTabState } from 'renderer/react/context/TabContext';
import useToast from 'renderer/react/hooks/useToast';
import i18next from 'i18next';
import { isI18nConsoleArg, isI18nError } from 'shared/i18n';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export default function useInstallMods(
  isUninstall: boolean = false,
): () => Promise<boolean> {
  const { t } = useTranslation();
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
  const savesPath = useFinalSavesPath();

  const [, setTab] = useTabState();

  return useCallback(async (): Promise<boolean> => {
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
        savesPath,
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
          title: t(
            isUninstall
              ? 'install.toast.noMods.uninstall'
              : 'install.toast.noMods.install',
          ),
        });
      } else if (modsInstalled.length > 0) {
        showToast({
          severity:
            modsInstalled.length < modsToInstall.length ? 'warning' : 'success',
          title: t(
            isUninstall
              ? 'install.toast.success.uninstall'
              : 'install.toast.success.install',
            {
              installed: modsInstalled.length,
              total: modsToInstall.length,
            },
          ),
        });
      }
      return true;
    } catch (error) {
      setIsInstalling(false);
      console.error(error);
      showToast({
        severity: 'error',
        title: t(
          isUninstall
            ? 'install.toast.error.uninstall'
            : 'install.toast.error.install',
        ),
        description: isI18nError(error)
          ? error.i18nChain
              .map((entry) =>
                isI18nConsoleArg(entry)
                  ? i18next.t(entry.key, entry.args ?? {})
                  : String(entry),
              )
              .join(':\n')
          : String(error),
      });
      // switch to the logs tab so user can see what happened
      setTab('logs');
      return false;
    }
  }, [
    dataPath,
    gamePath,
    isDirectMode,
    isPreExtractedData,
    isUninstall,
    logger,
    modsToInstall,
    outputModName,
    outputPath,
    preExtractedDataPath,
    savesPath,
    setInstalledMods,
    setIsInstalling,
    setTab,
    showToast,
    t,
  ]);
}
