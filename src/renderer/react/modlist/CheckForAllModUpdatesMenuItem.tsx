import useCheckModsForUpdates from 'renderer/react/context/hooks/useCheckModsForUpdates';
import useNexusAuthState from 'renderer/react/context/hooks/useNexusAuthState';
import useAsyncCallback from 'renderer/react/hooks/useAsyncCallback';
import { Update } from '@mui/icons-material';
import { MenuItem } from '@mui/material';

export default function CheckForAllModUpdatesMenuItem({
  onHideMenu,
}: {
  onHideMenu: () => void;
}): JSX.Element {
  const { nexusAuthState } = useNexusAuthState();
  const checkModsForUpdates = useCheckModsForUpdates(nexusAuthState);

  const onCheckForUpdates = useAsyncCallback(async () => {
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
