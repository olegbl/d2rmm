import { useCallback } from 'react';
import { Add } from '@mui/icons-material';
import { MenuItem } from '@mui/material';
import { useAddSectionHeader } from '../context/ModsContext';

export default function AddSectionHeaderMenuItem({
  onHideMenu,
}: {
  onHideMenu: () => void;
}): JSX.Element {
  const addSectionHeader = useAddSectionHeader();
  const onAddSectionHeader = useCallback(() => {
    onHideMenu();
    addSectionHeader();
    // TODO: scroll list to end
  }, [addSectionHeader, onHideMenu]);

  return (
    <MenuItem disableRipple={true} onClick={onAddSectionHeader}>
      <Add sx={{ marginRight: 1 }} />
      Add Section Header
    </MenuItem>
  );
}
