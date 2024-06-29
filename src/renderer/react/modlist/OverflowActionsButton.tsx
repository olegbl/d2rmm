import { useCallback, useState } from 'react';
import { Add, MoreVert, Refresh } from '@mui/icons-material';
import { Button, Menu, MenuItem } from '@mui/material';
import { useAddSectionHeader, useMods } from '../context/ModsContext';

type Props = Record<string, never>;

export default function OverflowActionsButton(_props: Props): JSX.Element {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isMenuShown = anchorEl != null;
  const onShowMenu = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);
  const onHideMenu = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const [, onRefreshMods] = useMods();
  const [, setIsRefreshing] = useState(false);
  const onRefreshModList = useCallback(async () => {
    onHideMenu();
    setIsRefreshing(true);
    await onRefreshMods();
    setIsRefreshing(false);
  }, [onHideMenu, onRefreshMods]);

  const addSectionHeader = useAddSectionHeader();
  const onAddSectionHeader = useCallback(() => {
    onHideMenu();
    addSectionHeader();
    // TODO: scroll list to end
  }, [addSectionHeader, onHideMenu]);

  return (
    <>
      <Button
        aria-controls={isMenuShown ? 'overflow-actions-menu' : undefined}
        aria-expanded={isMenuShown ? 'true' : undefined}
        aria-haspopup="true"
        disableElevation={true}
        endIcon={<MoreVert />}
        id="overflow-actions-button"
        onClick={onShowMenu}
        sx={{ paddingLeft: 0 }}
      />
      <Menu
        anchorEl={anchorEl}
        id="overflow-actions-menu"
        MenuListProps={{
          'aria-labelledby': 'overflow-actions-button',
        }}
        onClose={onHideMenu}
        open={isMenuShown}
      >
        <MenuItem disableRipple={true} onClick={onRefreshModList}>
          <Refresh sx={{ marginRight: 1 }} />
          Refresh Mod List
        </MenuItem>
        <MenuItem disableRipple={true} onClick={onAddSectionHeader}>
          <Add sx={{ marginRight: 1 }} />
          Add Section Header
        </MenuItem>
      </Menu>
    </>
  );
}
