import { useEventAPIListener } from 'renderer/EventAPI';
import { INexusAuthState } from 'renderer/react/context/NexusModsContext';
import useModInstaller from 'renderer/react/context/hooks/useModInstaller';
import { useCallback } from 'react';

export default function useNxmProtocolHandler(
  authState: INexusAuthState,
): void {
  const installMod = useModInstaller(authState);

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
      installMod({
        nexusModID,
        nexusFileID,
        key,
        expires,
      })
        .then()
        .catch(console.error);
    },
    [installMod],
  );

  useEventAPIListener('nexus-mods-open-url', onOpenNxmUrl);
}
