import type { ModUpdaterDownload } from 'bridge/ModUpdaterAPI';
import { useMods } from 'renderer/react/context/ModsContext';
import useModInstaller from 'renderer/react/context/hooks/useModInstaller';
import useModUpdates from 'renderer/react/context/hooks/useModUpdates';
import useNexusAuthState from 'renderer/react/context/hooks/useNexusAuthState';
import getNexusModID from 'renderer/react/context/utils/getNexusModID';
import useAsyncCallback from 'renderer/react/hooks/useAsyncCallback';
import useToast from 'renderer/react/hooks/useToast';
import { useMemo } from 'react';
import { SystemUpdateAlt } from '@mui/icons-material';
import { MenuItem } from '@mui/material';

export default function UpdateAllModsMenuItem({
  onHideMenu,
}: {
  onHideMenu: () => void;
}): JSX.Element | null {
  const showToast = useToast();
  const { nexusAuthState } = useNexusAuthState();
  const installMod = useModInstaller(nexusAuthState);
  const [mods] = useMods();
  const [updates] = useModUpdates();

  type PendingUpdate = {
    modID: string;
    modName: string;
    nexusModID: string;
    download: ModUpdaterDownload;
  };

  const pendingUpdates = useMemo((): PendingUpdate[] => {
    if (!nexusAuthState.isPremium) {
      return [];
    }
    const result: PendingUpdate[] = [];
    for (const mod of mods) {
      const nexusModID = getNexusModID(mod);
      if (nexusModID == null) {
        continue;
      }
      const updateState = updates.get(mod.id);
      const download = updateState?.isUpdateAvailable
        ? updateState.nexusUpdates[0]
        : null;
      if (download != null) {
        result.push({
          modID: mod.id,
          modName: mod.info.name ?? mod.id,
          nexusModID,
          download,
        });
      }
    }
    return result;
  }, [mods, updates, nexusAuthState.isPremium]);

  const onUpdateAll = useAsyncCallback(async () => {
    onHideMenu();
    for (const { modID, modName, nexusModID, download } of pendingUpdates) {
      try {
        await installMod({
          modID,
          nexusModID,
          nexusFileID: download.fileID,
          version: download.version,
        });
      } catch (error) {
        showToast({
          severity: 'error',
          title: `Failed to update ${modName}`,
          description: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }, [onHideMenu, pendingUpdates, installMod, showToast]);

  if (pendingUpdates.length === 0) {
    return null;
  }

  return (
    <MenuItem disableRipple={true} onClick={onUpdateAll}>
      <SystemUpdateAlt sx={{ marginRight: 1 }} />
      Update All Mods ({pendingUpdates.length})
    </MenuItem>
  );
}
