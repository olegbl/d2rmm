import { useEventAPIListener } from 'renderer/EventAPI';
import { INexusAuthState } from 'renderer/react/context/NexusModsContext';
import useModCollectionInstaller from 'renderer/react/context/hooks/useModCollectionInstaller';
import useModInstaller from 'renderer/react/context/hooks/useModInstaller';
import { useCallback } from 'react';

export default function useNxmProtocolHandler(
  authState: INexusAuthState,
): void {
  const installMod = useModInstaller(authState);
  const installCollection = useModCollectionInstaller(authState);

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

  const onOpenCollectionUrl = useCallback(
    ({
      collectionSlug,
      revisionNumber,
    }: {
      collectionSlug: string;
      revisionNumber: number;
    }) => {
      installCollection({ collectionSlug, revisionNumber })
        .then()
        .catch(console.error);
    },
    [installCollection],
  );

  useEventAPIListener('nexus-mods-open-url', onOpenNxmUrl);
  useEventAPIListener('nexus-mods-open-collection-url', onOpenCollectionUrl);
}
