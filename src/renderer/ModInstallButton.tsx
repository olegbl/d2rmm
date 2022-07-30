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
      if (!isPreExtractedData) {
        API.openStorage(gamePath);
      }

      if (!isDirectMode) {
        API.deleteFile(mergedPath);
        API.createDirectory(mergedPath);
        API.writeJson(`${mergedPath}\\..\\modinfo.json`, {
          name: 'D2RMM',
          savepath: 'D2RMM/',
        });
      }

      for (let i = 0; i < modsToInstall.length; i = i + 1) {
        const mod = modsToInstall[i];
        try {
          const code = API.readModCode(mod.id);
          const api = getModAPI(mod, preferences, showToast);
          const installMod = sandbox(code);
          installMod({ D2RMM: api, config: mod.config, Math });
        } catch (error) {
          showToast({
            severity: 'error',
            title: `Error When Installing Mod ${mod.info.name}`,
            description: String(error),
          });
        }
      }

      if (!isPreExtractedData) {
        API.closeStorage();
      }

      showToast({ severity: 'success', title: 'Mods Installed' });
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
