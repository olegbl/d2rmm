import type { Mod } from 'bridge/BridgeAPI';
import type { ModUpdaterDownload } from 'bridge/ModUpdaterAPI';
import useModInstaller from 'renderer/react/context/hooks/useModInstaller';
import useModUpdate from 'renderer/react/context/hooks/useModUpdate';
import useNexusAuthState from 'renderer/react/context/hooks/useNexusAuthState';
import getNexusModID from 'renderer/react/context/utils/getNexusModID';
import useCheckModForUpdates from 'renderer/react/context/utils/useCheckModForUpdates';
import useAsyncCallback from 'renderer/react/hooks/useAsyncCallback';
import { useCallback } from 'react';

export default function useModUpdater(mod: Mod): {
  isUpdatePossible: boolean;
  isDownloadPossible: boolean;
  isUpdateChecked: boolean;
  isUpdateAvailable: boolean;
  latestUpdate: ModUpdaterDownload | null;
  downloads: ModUpdaterDownload[];
  onCheckForUpdates: () => Promise<void>;
  onDownloadVersion: (download: ModUpdaterDownload) => Promise<void>;
} {
  const { nexusAuthState } = useNexusAuthState();
  const installMod = useModInstaller(nexusAuthState);
  const checkModForUpdates = useCheckModForUpdates(nexusAuthState);
  const nexusModID = getNexusModID(mod);
  const isUpdatePossible =
    nexusAuthState != null && mod.info.website != null && nexusModID != null;
  const isDownloadPossible =
    isUpdatePossible && (nexusAuthState.isPremium ?? false);
  const [updateState] = useModUpdate(mod.id);
  const latestUpdate = updateState.nexusUpdates[0];
  const isUpdateChecked = updateState.isUpdateChecked;
  const isUpdateAvailable = updateState.isUpdateAvailable;

  const onCheckForUpdates = useAsyncCallback(async () => {
    await checkModForUpdates(mod);
  }, [checkModForUpdates, mod]);

  const onDownloadVersion = useCallback(
    async (download: ModUpdaterDownload) => {
      if (nexusAuthState.apiKey == null || nexusModID == null) {
        return;
      }

      await installMod({
        modID: mod.id,
        nexusModID,
        nexusFileID: download.fileID,
        version: download.version,
      });
    },
    [nexusAuthState.apiKey, nexusModID, installMod, mod.id],
  );

  return {
    isUpdatePossible,
    isDownloadPossible,
    isUpdateChecked,
    isUpdateAvailable,
    latestUpdate,
    downloads: updateState.nexusDownloads,
    onCheckForUpdates,
    onDownloadVersion,
  };
}
