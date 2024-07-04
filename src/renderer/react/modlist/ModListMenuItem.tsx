import { useModListMenuContext } from 'renderer/react/modlist/context/ModListMenuContext';
import { NestedMenuItem } from 'mui-nested-menu';
import { ListItemIcon, ListItemText, MenuItem } from '@mui/material';

type Props = {
  children?: React.ReactNode;
  icon?: React.ReactElement;
  label: string;
  onClick?: () => void;
};

export default function ModListMenuItem({
  children,
  icon,
  label,
  onClick,
}: Props) {
  const { isContextMenuOpen, onCloseContextMenu } = useModListMenuContext();

  if (children == null) {
    return (
      <MenuItem
        onClick={() => {
          onCloseContextMenu();
          onClick?.();
        }}
      >
        {icon && <ListItemIcon>{icon}</ListItemIcon>}
        <ListItemText>{label}</ListItemText>
      </MenuItem>
    );
  }

  return (
    <NestedMenuItem
      component={MenuItem}
      delay={250}
      leftIcon={<ListItemIcon sx={{ marginLeft: 1.5 }}>{icon}</ListItemIcon>}
      parentMenuOpen={isContextMenuOpen}
      renderLabel={() => <ListItemText>{label}</ListItemText>}
    >
      {children}
    </NestedMenuItem>
  );
}
