import { useEventAPIListener } from 'renderer/EventAPI';
import ModUpdaterAPI from 'renderer/ModUpdaterAPI';
import { useMods } from 'renderer/react/context/ModsContext';
import { INexusAuthState } from 'renderer/react/context/NexusModsContext';
import { useUpdateModVersion } from 'renderer/react/context/hooks/useUpdateModVersion';
import useCheckModForUpdates from 'renderer/react/context/utils/useCheckModForUpdates';
import { useCallback } from 'react';

export default function useNxmProtocolHandler(
  authState: INexusAuthState,
): void {
  const [, onRefreshMods] = useMods();
  const updateModVersion = useUpdateModVersion();
  const checkModForUpdates = useCheckModForUpdates(authState);

  const onOpenNxmUrl = useCallback(
    ({
      nexusModID,
      nexusFileID,
      key,
      expires,
    }: {
      nexusModID: string;
      nexusFileID: number;
      key: string | null;
      expires: number | null;
    }) => {
      if (authState.apiKey != null) {
        (async () => {
          const modID = await ModUpdaterAPI.installModViaNexus(
            null,
            authState.apiKey ?? '',
            nexusModID,
            nexusFileID,
            key ?? undefined,
            expires ?? undefined,
          );
          const mods = await onRefreshMods();
          const mod = mods.find((mod) => mod.id === modID);
          if (mod != null) {
            const newVersion = mod.info.version;
            if (newVersion != null) {
              const isUpdated = await updateModVersion(modID, newVersion);
              if (!isUpdated) {
                await checkModForUpdates(mod);
              }
            }
          }
        })()
          .then()
          .catch(console.error);
      } else {
        console.warn(
          `Couldn't handle nxm:// url for file ${nexusFileID} in mod ${nexusModID} because Nexus Mods is not authenticated.`,
        );
      }
    },
    [authState.apiKey, checkModForUpdates, onRefreshMods, updateModVersion],
  );

  useEventAPIListener('nexus-mods-open-url', onOpenNxmUrl);
}
