import { useCallback, useState } from 'react';
import { Refresh } from '@mui/icons-material';
import { MenuItem } from '@mui/material';
import { useMods } from '../context/ModsContext';

export default function RefreshModListMenuItem({
  onHideMenu,
}: {
  onHideMenu: () => void;
}): JSX.Element {
  const [, onRefreshMods] = useMods();
  const [, setIsRefreshing] = useState(false);
  const onRefreshModList = useCallback(async () => {
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
