import { useCallback } from 'react';
import type { Mod } from 'bridge/BridgeAPI';
import type { IModUpdaterAPI, ModUpdaterDownload } from 'bridge/ModUpdaterAPI';
import { consumeAPI } from 'renderer/IPC';
import { compareVersions } from 'renderer/utils/version';
import { useMods } from '../context/ModsContext';
import { useNexusAuthState } from '../context/NexusModsContext';
import { useModUpdate } from '../context/UpdatesContext';

const ModUpdaterAPI = consumeAPI<IModUpdaterAPI>('ModUpdaterAPI');

function getNexusModID(mod: Mod): string | null {
  return (
    mod.info.website?.match(/\/diablo2resurrected\/mods\/(\d+)/)?.[1] ?? null
  );
}

function getUpdatesFromDownloads(
  currentVersion: string,
  downloads: ModUpdaterDownload[],
): ModUpdaterDownload[] {
  return downloads.filter(
    (download) => compareVersions(download.version, currentVersion) < 0,
  );
}

export function useModUpdater(mod: Mod): {
  isUpdatePossible: boolean;
  isUpdateChecked: boolean;
  isUpdateAvailable: boolean;
  latestUpdate: ModUpdaterDownload | null;
  downloads: ModUpdaterDownload[];
  onCheckForUpdates: () => Promise<void>;
  onDownloadVersion: (download: ModUpdaterDownload) => Promise<void>;
} {
  const [, onRefreshMods] = useMods();
  const { nexusAuthState } = useNexusAuthState();
  const nexusModID = getNexusModID(mod);
  const isUpdatePossible =
    nexusAuthState != null && mod.info.website != null && nexusModID != null;
  const [updateState, setUpdateState] = useModUpdate(mod.id);
  const latestUpdate = updateState.nexusUpdates[0];
  const isUpdateChecked = updateState.isUpdateChecked;
  const isUpdateAvailable = updateState.isUpdateAvailable;
  // TODO: handle non-premium Nexus Mods users

  const onCheckForUpdates = useCallback(async () => {
    if (nexusAuthState.apiKey == null || nexusModID == null) {
      return;
    }
    const currentVersion = mod.info.version ?? '0';

    const nexusDownloads = (
      await ModUpdaterAPI.getDownloadsViaNexus(
        nexusAuthState.apiKey,
        nexusModID,
      )
    ).sort((a, b) => compareVersions(a.version, b.version));

    const nexusUpdates = getUpdatesFromDownloads(
      currentVersion,
      nexusDownloads,
    );

    setUpdateState({
      isUpdateChecked: true,
      isUpdateAvailable: nexusUpdates.length > 0,
      nexusUpdates,
      nexusDownloads,
    });
  }, [mod.info.version, nexusAuthState.apiKey, nexusModID, setUpdateState]);

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
      setUpdateState((oldUpdateState) => {
        const nexusUpdates = getUpdatesFromDownloads(
          newVersion,
          oldUpdateState.nexusDownloads,
        );
        return {
          isUpdateChecked: true,
          isUpdateAvailable: nexusUpdates.length > 0,
          nexusUpdates,
          nexusDownloads: oldUpdateState.nexusDownloads,
        };
      });

      await onRefreshMods();
    },
    [nexusAuthState.apiKey, nexusModID, mod.id, setUpdateState, onRefreshMods],
  );

  return {
    isUpdatePossible,
    isUpdateChecked,
    isUpdateAvailable,
    latestUpdate,
    downloads: updateState.nexusDownloads,
    onCheckForUpdates,
    onDownloadVersion,
  };
}
