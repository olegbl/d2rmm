import AddSectionHeaderMenuItem from 'renderer/react/modlist/AddSectionHeaderMenuItem';
import CheckForAllModUpdatesMenuItem from 'renderer/react/modlist/CheckForAllModUpdatesMenuItem';
import RefreshModListMenuItem from 'renderer/react/modlist/RefreshModListMenuItem';
import { useCallback, useState } from 'react';
import { MoreVert } from '@mui/icons-material';
import { Button, Menu } from '@mui/material';

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
        <RefreshModListMenuItem onHideMenu={onHideMenu} />
        <CheckForAllModUpdatesMenuItem onHideMenu={onHideMenu} />
        <AddSectionHeaderMenuItem onHideMenu={onHideMenu} />
      </Menu>
    </>
  );
}
