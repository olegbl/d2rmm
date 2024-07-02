import { useCallback } from 'react';
import useModUpdates from 'renderer/react/context/hooks/useModUpdates';
import getUpdatesFromDownloads from 'renderer/react/context/utils/getUpdatesFromDownloads';

export function useUpdateModVersion(): (
  modID: string,
  version: string,
) => Promise<boolean> {
  const [, setUpdates] = useModUpdates();

  return useCallback(
    async (modID: string, newVersion: string): Promise<boolean> => {
      let isUpdated = false;
      setUpdates((oldUpdates) => {
        const oldUpdateState = oldUpdates.get(modID);
        if (oldUpdateState == null) {
          isUpdated = false;
          return oldUpdates;
        }

        const nexusUpdates = getUpdatesFromDownloads(
          newVersion,
          oldUpdateState.nexusDownloads,
        );

        const newUpdates = new Map(oldUpdates);
        newUpdates.set(modID, {
          isUpdateChecked: true,
          isUpdateAvailable: nexusUpdates.length > 0,
          nexusUpdates,
          nexusDownloads: oldUpdateState.nexusDownloads,
        });
        isUpdated = true;
        return newUpdates;
      });
      return isUpdated;
    },
    [setUpdates],
  );
}
