import type { Mod } from 'bridge/BridgeAPI';
import { compareVersions } from 'main/version';
import ModUpdaterAPI from 'renderer/ModUpdaterAPI';
import { INexusAuthState } from 'renderer/react/context/NexusModsContext';
import useModUpdates from 'renderer/react/context/hooks/useModUpdates';
import getNexusModID from 'renderer/react/context/utils/getNexusModID';
import getUpdatesFromDownloads from 'renderer/react/context/utils/getUpdatesFromDownloads';
import { useCallback } from 'react';

export default function useCheckModForUpdates(
  nexusAuthState: INexusAuthState,
  modOuter?: Mod,
): (modInner?: Mod) => Promise<void> {
  const [, setUpdates] = useModUpdates();

  return useCallback(
    async (modInner?: Mod): Promise<void> => {
      const mod = modOuter ?? modInner;
      const nexusModID = getNexusModID(mod);
      if (nexusAuthState.apiKey == null || nexusModID == null || mod == null) {
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

      setUpdates((oldUpdates) => {
        const newUpdates = new Map(oldUpdates);
        newUpdates.set(mod.id, {
          isUpdateChecked: true,
          isUpdateAvailable: nexusUpdates.length > 0,
          nexusUpdates,
          nexusDownloads,
        });
        return newUpdates;
      });
    },
    [modOuter, nexusAuthState.apiKey, setUpdates],
  );
}
