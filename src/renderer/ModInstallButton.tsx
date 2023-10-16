import { useCallback, useMemo } from 'react';
import { LoadingButton } from '@mui/lab';
import { Tooltip } from '@mui/material';
import sandbox from './sandbox';
import getModAPI from './getModAPI';
import useToast from './useToast';
import { usePreferences } from './Preferences';
import { useLogger } from './Logs';
import { useEnabledMods } from './ModsContext';

const API = window.electron.API;

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
  const { gamePath, mergedPath, isPreExtractedData, isDirectMode } =
    preferences;

  const [enabledMods] = useEnabledMods();

  const modsToInstall = useMemo(
    () => orderedMods.filter((mod) => enabledMods[mod.id] ?? false),
    [orderedMods, enabledMods]
  );

  const label = isUninstall ? 'Uninstall' : 'Install';

  const onInstallMods = useCallback((): void => {
    try {
      logger.clear();

      console.debug(`Installing mods...`, preferences);

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
        try {
          console.debug(`Mod ${mod.info.name} parsing code...`);
          const code = API.readModCode(mod.id);
          const api = getModAPI(mod, {
            ...preferences,
            extractedFiles,
            isDryRun: isUninstall,
          });
          console.debug(`Mod ${mod.info.name} ${label.toLowerCase()}ing...`);
          const installMod = sandbox(code);
          installMod({ D2RMM: api, config: mod.config, Math });
          modsInstalled.push(mod);
          console.log(
            `Mod ${mod.info.name} ${label.toLowerCase()}ed successfully.`
          );
        } catch (error) {
          console.error(
            `Mod ${mod.info.name} encountered a compile error!`,
            error
          );
        }
      }

      if (!isPreExtractedData) {
        API.closeStorage();
      }

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
    gamePath,
    isDirectMode,
    isPreExtractedData,
    isUninstall,
    label,
    logger,
    mergedPath,
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
