import { useModListMenuContext } from 'renderer/react/modlist/context/ModListMenuContext';
import { Menu } from '@mui/material';

type Props = {
  children: React.ReactNode;
};

export default function ModListMenu({ children }: Props) {
  const { contextMenuAnchor, onCloseContextMenu } = useModListMenuContext();

  return (
    <Menu
      anchorPosition={contextMenuAnchor ?? undefined}
      anchorReference="anchorPosition"
      onClose={onCloseContextMenu}
      open={contextMenuAnchor != null}
    >
      {children}
    </Menu>
  );
}
