import ModUpdaterAPI from 'renderer/ModUpdaterAPI';
import { useMods } from 'renderer/react/context/ModsContext';
import { INexusAuthState } from 'renderer/react/context/NexusModsContext';
import useModConfigOverrides from 'renderer/react/context/hooks/useModConfigOverrides';
import { useUpdateModVersion } from 'renderer/react/context/hooks/useUpdateModVersion';
import useCheckModForUpdates from 'renderer/react/context/utils/useCheckModForUpdates';
import useToast from 'renderer/react/hooks/useToast';
import { useCallback } from 'react';

export default function useModInstaller(authState: INexusAuthState) {
  const showToast = useToast();
  const updateModVersion = useUpdateModVersion();
  const [, refreshMods] = useMods();
  const checkModForUpdates = useCheckModForUpdates(authState);
  const [, setModConfigOverrides] = useModConfigOverrides();

  return useCallback(
    async ({
      expires,
      key,
      modID: originalModID,
      version,
      nexusFileID,
      nexusModID,
    }: {
      expires?: number | null;
      key?: string | null;
      modID?: string | null;
      version?: string | null;
      nexusFileID: number;
      nexusModID: string;
    }) => {
      if (authState.apiKey == null) {
        const message = `Couldn't handle nxm:// url for file ${nexusFileID} in mod ${nexusModID} because Nexus Mods is not authenticated.`;
        showToast({
          title: message,
          severity: 'warning',
        });
        throw new Error(message);
      }

      const modID = await ModUpdaterAPI.installModViaNexus(
        originalModID ?? null,
        authState.apiKey ?? '',
        nexusModID,
        nexusFileID,
        key ?? undefined,
        expires ?? undefined,
      );
      const mod = (await refreshMods([modID])).find((m) => m.id === modID);
      if (mod != null) {
        // if the downloaded mod doesn't specify a website
        // we can override the website field
        if (mod.info.website == null) {
          setModConfigOverrides((oldOverrides) => ({
            ...oldOverrides,
            [modID]: {
              ...oldOverrides[modID],
              website: `https://www.nexusmods.com/diablo2resurrected/mods/${nexusModID}`,
            },
          }));
        }

        // if the downloaded mod doesn't specify a version
        // but we know what version we were going to install
        // we can override the version
        if (mod.info.version == null && version != null) {
          setModConfigOverrides((oldOverrides) => ({
            ...oldOverrides,
            [modID]: {
              ...oldOverrides[modID],
              version,
            },
          }));
        }

        const installedVersion = mod.info.version ?? version;
        if (installedVersion != null) {
          const isUpdated = await updateModVersion(modID, installedVersion);
          // if we didn't find a mod with cached version update information
          // that means we need to check for updates for this mod
          if (!isUpdated) {
            await checkModForUpdates({
              ...mod,
              info: {
                ...mod.info,
                version: installedVersion,
              },
            });
          }
        }

        const versionText = version == null ? '' : ` v${version}`;
        const message = `${mod.info.name}${versionText} installed!`;
        console.log(message);
        showToast({
          duration: 5000,
          title: message,
          severity: 'success',
        });
      }
    },
    [
      authState.apiKey,
      checkModForUpdates,
      refreshMods,
      setModConfigOverrides,
      showToast,
      updateModVersion,
    ],
  );
}
