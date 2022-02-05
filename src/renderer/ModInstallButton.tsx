import { useCallback, useMemo, useState } from 'react';
import { LoadingButton } from '@mui/lab';
import sandbox from './sandbox';
import getModAPI from './getModAPI';
import useToast from './useToast';
import { EnabledMods } from './useEnabledMods';

const API = window.electron.API;

type Props = {
  enabledMods: EnabledMods;
  orderedMods: Mod[];
  paths: D2RMMPaths;
};

export default function ModInstallButton({
  enabledMods,
  orderedMods,
  paths,
}: Props): JSX.Element {
  const showToast = useToast();

  const modsToInstall = useMemo(
    () => orderedMods.filter((mod) => enabledMods[mod.id] ?? false),
    [orderedMods, enabledMods]
  );
  const [installingMod, setInstallingMod] = useState(0);
  const onInstallMods = useCallback((): void => {
    setInstallingMod(0);

    try {
      API.deleteFile(paths.mergedPath);
      API.createDirectory(paths.mergedPath);
      API.writeJson(`${paths.mergedPath}\\..\\modinfo.json`, {
        name: 'D2RMM',
        savepath: 'D2RMM/',
      });

      API.openStorage(paths.gamePath);

      for (let i = 0; i < modsToInstall.length; i += 1) {
        setInstallingMod(i + 1);
        const mod = modsToInstall[i];
        const code = API.readModCode(mod.id);
        const api = getModAPI(mod, paths, showToast);
        const installMod = sandbox(code);
        installMod({ D2RMM: api, config: mod.config });
      }

      API.closeStorage();

      showToast({ severity: 'success', title: 'Mods Installed' });
    } catch (error) {
      showToast({
        severity: 'error',
        title: 'Error When Installing Mods',
        description: String(error),
      });
    }

    setInstallingMod(0);
  }, [paths, modsToInstall, showToast]);

  return (
    <LoadingButton
      loading={installingMod > 0}
      loadingIndicator={`Installing mod ${installingMod}/${modsToInstall.length}...`}
      onClick={onInstallMods}
      variant="outlined"
    >
      Install Mods
    </LoadingButton>
  );
}
