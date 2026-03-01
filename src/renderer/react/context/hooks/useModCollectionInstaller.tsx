import ModUpdaterAPI from 'renderer/ModUpdaterAPI';
import {
  useSectionHeaders,
  useSetItemsOrder,
} from 'renderer/react/context/ModsContext';
import { INexusAuthState } from 'renderer/react/context/NexusModsContext';
import useModInstaller from 'renderer/react/context/hooks/useModInstaller';
import useToast from 'renderer/react/hooks/useToast';
import { useCallback } from 'react';

export default function useModCollectionInstaller(authState: INexusAuthState) {
  const installMod = useModInstaller(authState);
  const showToast = useToast();
  const [, setSectionHeaders] = useSectionHeaders();
  const setItemsOrder = useSetItemsOrder();

  return useCallback(
    async ({
      collectionSlug,
      revisionNumber,
    }: {
      collectionSlug: string;
      revisionNumber: number;
    }) => {
      if (authState.apiKey == null) {
        const message = `Couldn't install collection "${collectionSlug}" because Nexus Mods is not authenticated.`;
        showToast({
          title: message,
          severity: 'warning',
        });
        throw new Error(message);
      }

      const collection = await ModUpdaterAPI.getCollectionRevision(
        authState.apiKey,
        collectionSlug,
        revisionNumber,
      );

      for (const collectionMod of collection.modFiles) {
        if (
          collectionMod.file == null ||
          collectionMod.file.mod.game.domainName !== 'diablo2resurrected'
        ) {
          continue;
        }

        const modId = await installMod({
          nexusModID: String(collectionMod.file.mod.modId),
          nexusFileID: collectionMod.file.fileId,
        }).catch(() => null);
        if (modId == null) continue;

        const category =
          collectionMod.file.mod.modCategory?.name ?? 'Uncategorized';

        // Find or create the section header for this category, then
        // immediately insert the mod into the item order — all within
        // the setSectionHeaders functional update so we have the
        // latest pending headers state (including ones created earlier
        // in this same loop) without needing a local working copy.
        setSectionHeaders((old) => {
          let header = old.headers.find((h) => h.label === category);
          const isNew = header == null;
          if (isNew) {
            header = {
              id: `sectionHeader:${old.nextIndex}`,
              label: category,
              isExpanded: true,
            };
          }
          const headerId = header!.id;
          const headerIds = old.headers.map((h) => h.id);
          if (isNew) headerIds.push(headerId);

          setItemsOrder((currentOrder) => {
            const order = currentOrder.filter((id) => id !== modId);
            const headerPos = order.indexOf(headerId);
            if (headerPos === -1) {
              // Header is new — append header then mod
              order.push(headerId, modId);
            } else {
              // Find the position right before the next section header
              // (that's the end of this section)
              let insertAt = order.length;
              for (let i = headerPos + 1; i < order.length; i++) {
                if (headerIds.includes(order[i])) {
                  insertAt = i;
                  break;
                }
              }
              order.splice(insertAt, 0, modId);
            }
            return order;
          });

          return isNew
            ? {
                nextIndex: old.nextIndex + 1,
                headers: [...old.headers, header!],
              }
            : old;
        });
      }
    },
    [authState.apiKey, installMod, setSectionHeaders, setItemsOrder, showToast],
  );
}
