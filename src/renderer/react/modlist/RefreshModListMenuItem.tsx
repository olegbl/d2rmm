import { useMods } from 'renderer/react/context/ModsContext';
import useAsyncCallback from 'renderer/react/hooks/useAsyncCallback';
import { useState } from 'react';
import { Refresh } from '@mui/icons-material';
import { MenuItem } from '@mui/material';

export default function RefreshModListMenuItem({
  onHideMenu,
}: {
  onHideMenu: () => void;
}): JSX.Element {
  const [, onRefreshMods] = useMods();
  const [, setIsRefreshing] = useState(false);
  const onRefreshModList = useAsyncCallback(async () => {
    onHideMenu();
    setIsRefreshing(true);
    await onRefreshMods();
    setIsRefreshing(false);
  }, [onHideMenu, onRefreshMods]);

  return (
    <MenuItem disableRipple={true} onClick={onRefreshModList}>
      <Refresh sx={{ marginRight: 1 }} />
      Refresh Mod List
    </MenuItem>
  );
}
