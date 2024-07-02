import { useCallback } from 'react';
import type { Mod } from 'bridge/BridgeAPI';
import type { ModUpdaterNexusDownload } from 'bridge/ModUpdaterAPI';
import ModUpdaterAPI from 'renderer/ModUpdaterAPI';
import { useMods } from 'renderer/react/context/ModsContext';
import { INexusAuthState } from 'renderer/react/context/NexusModsContext';
import useModUpdates from 'renderer/react/context/hooks/useModUpdates';
import getNexusModID from 'renderer/react/context/utils/getNexusModID';
import getUpdatesFromDownloads from 'renderer/react/context/utils/getUpdatesFromDownloads';
import { compareVersions } from 'renderer/utils/version';

export default function useCheckModsForUpdates(
  nexusAuthState: INexusAuthState,
): () => Promise<void> {
  const [mods] = useMods();
  const [, setUpdates] = useModUpdates();

  return useCallback(async (): Promise<void> => {
    const modsToCheck = mods.filter((mod) => getNexusModID(mod) != null);
    if (nexusAuthState.apiKey == null || modsToCheck.length === 0) {
      return;
    }

    // TODO: handle errors in a better way
    const results = await Promise.all(
      modsToCheck.map(
        async (
          mod,
        ): Promise<
          [Mod, ModUpdaterNexusDownload[], ModUpdaterNexusDownload[]]
        > => {
          const currentVersion = mod.info.version ?? '0';

          const nexusDownloads = (
            await ModUpdaterAPI.getDownloadsViaNexus(
              nexusAuthState.apiKey as string,
              getNexusModID(mod) as string,
            )
          ).sort((a, b) => compareVersions(a.version, b.version));

          const nexusUpdates = getUpdatesFromDownloads(
            currentVersion,
            nexusDownloads,
          );

          return [mod, nexusDownloads, nexusUpdates];
        },
      ),
    );

    setUpdates((oldUpdates) => {
      const newUpdates = new Map(oldUpdates);
      results.forEach(([mod, nexusDownloads, nexusUpdates]) =>
        newUpdates.set(mod.id, {
          isUpdateChecked: true,
          isUpdateAvailable: nexusUpdates.length > 0,
          nexusUpdates,
          nexusDownloads,
        }),
      );
      return newUpdates;
    });
  }, [mods, nexusAuthState.apiKey, setUpdates]);
}
