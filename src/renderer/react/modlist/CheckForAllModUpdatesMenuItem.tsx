import { useCallback } from 'react';
import { Update } from '@mui/icons-material';
import { MenuItem } from '@mui/material';
import { useNexusAuthState } from '../context/NexusModsContext';
import { useCheckModsForUpdates } from '../context/UpdatesContext';

export default function CheckForAllModUpdatesMenuItem({
  onHideMenu,
}: {
  onHideMenu: () => void;
}): JSX.Element {
  const { nexusAuthState } = useNexusAuthState();
  const checkModsForUpdates = useCheckModsForUpdates(nexusAuthState);

  const onCheckForUpdates = useCallback(async () => {
    onHideMenu();
    await checkModsForUpdates();
  }, [checkModsForUpdates, onHideMenu]);

  return (
    <MenuItem disableRipple={true} onClick={onCheckForUpdates}>
      <Update sx={{ marginRight: 1 }} />
      Check for Mod Updates
    </MenuItem>
  );
}
