import type { Mod } from 'bridge/BridgeAPI';
import type { IModUpdaterAPI, ModUpdaterDownload } from 'bridge/ModUpdaterAPI';
import { consumeAPI } from 'renderer/IPC';
import { useMods } from 'renderer/react/context/ModsContext';
import useModUpdate from 'renderer/react/context/hooks/useModUpdate';
import useNexusAuthState from 'renderer/react/context/hooks/useNexusAuthState';
import { useUpdateModVersion } from 'renderer/react/context/hooks/useUpdateModVersion';
import getNexusModID from 'renderer/react/context/utils/getNexusModID';
import useCheckModForUpdates from 'renderer/react/context/utils/useCheckModForUpdates';
import { useCallback } from 'react';

const ModUpdaterAPI = consumeAPI<IModUpdaterAPI>('ModUpdaterAPI');

export function useModUpdater(mod: Mod): {
  isUpdatePossible: boolean;
  isDownloadPossible: boolean;
  isUpdateChecked: boolean;
  isUpdateAvailable: boolean;
  latestUpdate: ModUpdaterDownload | null;
  downloads: ModUpdaterDownload[];
  onCheckForUpdates: () => Promise<void>;
  onDownloadVersion: (download: ModUpdaterDownload) => Promise<void>;
} {
  const [, onRefreshMods] = useMods();
  const { nexusAuthState } = useNexusAuthState();
  const updateModVersion = useUpdateModVersion();
  const checkModForUpdates = useCheckModForUpdates(nexusAuthState);
  const nexusModID = getNexusModID(mod);
  const isUpdatePossible =
    nexusAuthState != null && mod.info.website != null && nexusModID != null;
  const isDownloadPossible = nexusAuthState.isPremium ?? false;
  const [updateState] = useModUpdate(mod.id);
  const latestUpdate = updateState.nexusUpdates[0];
  const isUpdateChecked = updateState.isUpdateChecked;
  const isUpdateAvailable = updateState.isUpdateAvailable;

  const onCheckForUpdates = useCallback(async () => {
    await checkModForUpdates(mod);
  }, [checkModForUpdates, mod]);

  const onDownloadVersion = useCallback(
    async (download: ModUpdaterDownload) => {
      if (nexusAuthState.apiKey == null || nexusModID == null) {
        return;
      }

      await ModUpdaterAPI.installModViaNexus(
        mod.id,
        nexusAuthState.apiKey,
        nexusModID,
        download.fileID,
      );

      const newVersion = download.version;
      await onRefreshMods();
      await updateModVersion(mod.id, newVersion);
    },
    [
      nexusAuthState.apiKey,
      nexusModID,
      mod.id,
      onRefreshMods,
      updateModVersion,
    ],
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
