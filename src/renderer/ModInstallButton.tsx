import { useCallback, useMemo } from 'react';
import { LoadingButton } from '@mui/lab';
import sandbox from './sandbox';
import getModAPI from './getModAPI';
import useToast from './useToast';
import { EnabledMods } from './useEnabledMods';
import { usePreferences } from './Preferences';

const API = window.electron.API;

type Props = {
  enabledMods: EnabledMods;
  orderedMods: Mod[];
};

export default function ModInstallButton({
  enabledMods,
  orderedMods,
}: Props): JSX.Element {
  const showToast = useToast();
  const preferences = usePreferences();
  const { gamePath, mergedPath, isPreExtractedData, isDirectMode } =
    preferences;

  const modsToInstall = useMemo(
    () => orderedMods.filter((mod) => enabledMods[mod.id] ?? false),
    [orderedMods, enabledMods]
  );

  const onInstallMods = useCallback((): void => {
    try {
      if (!isDirectMode) {
        API.deleteFile(`${mergedPath}\\..`);
        API.createDirectory(mergedPath);
        API.writeJson(`${mergedPath}\\..\\modinfo.json`, {
          name: 'D2RMM',
          savepath: 'D2RMM/',
        });
      }

      if (!isPreExtractedData) {
        API.openStorage(gamePath);
      }

      const extractedFiles = {};

      const modsInstalled = [];
      for (let i = 0; i < modsToInstall.length; i = i + 1) {
        const mod = modsToInstall[i];
        const reportedErrors = [];
        const reportError = (error: string): void => {
          reportedErrors.push(error);
          showToast({
            severity: 'error',
            title: `Mod ${mod.info.name} encountered a runtime error!`,
            description: error,
          });
        };
        try {
          const code = API.readModCode(mod.id);
          const api = getModAPI(mod, preferences, extractedFiles, reportError);
          const installMod = sandbox(code);
          installMod({ D2RMM: api, config: mod.config, Math });
          if (reportedErrors.length === 0) {
            modsInstalled.push(mod);
          }
        } catch (error) {
          showToast({
            severity: 'error',
            title: `Mod ${mod.info.name} encountered a compile error!`,
            description: String(error),
          });
        }
      }

      if (!isPreExtractedData) {
        API.closeStorage();
      }

      if (modsToInstall.length === 0) {
        showToast({
          severity: 'success',
          title: 'No Mods Installed',
        });
      } else if (modsInstalled.length > 0) {
        showToast({
          severity:
            modsInstalled.length < modsToInstall.length ? 'warning' : 'success',
          title: `${modsInstalled.length}/${modsToInstall.length} Mods Installed`,
        });
      }
    } catch (error) {
      showToast({
        severity: 'error',
        title: 'Error When Installing Mods',
        description: String(error),
      });
    }
  }, [
    gamePath,
    isDirectMode,
    isPreExtractedData,
    mergedPath,
    modsToInstall,
    preferences,
    showToast,
  ]);

  return (
    <LoadingButton onClick={onInstallMods} variant="outlined">
      Install Mods
    </LoadingButton>
  );
}
