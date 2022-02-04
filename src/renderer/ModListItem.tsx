import {
  Menu as MenuIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import {
  Checkbox,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import { useCallback, useState } from 'react';
import { Draggable } from 'react-beautiful-dnd';

const API = window.electron.API;

type Props = {
  index: number;
  isEnabled: boolean;
  mod: Mod;
  onConfigureMod: (mod: Mod) => unknown;
  onToggleMod: (mod: Mod) => unknown;
};

export default function ModListItem({
  index,
  isEnabled,
  mod,
  onConfigureMod: onConfigureModFromProps,
  onToggleMod,
}: Props) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const onCloseMenu = useCallback((): void => {
    setAnchorEl(null);
  }, []);

  const onOpenMenu = useCallback(
    (event: React.MouseEvent<HTMLElement>): void => {
      setAnchorEl(event.currentTarget);
    },
    []
  );

  const onConfigureMod = useCallback((): void => {
    onCloseMenu();
    onConfigureModFromProps(mod);
  }, [mod, onCloseMenu, onConfigureModFromProps]);

  const onOpenWebsite = useCallback((): void => {
    onCloseMenu();
    if (mod.info.website != null) {
      API.openURL(mod.info.website);
    }
  }, [mod, onCloseMenu]);

  const labelId = `mod-label-${mod}`;

  const menuOptions = [
    mod.info.config == null ? null : (
      <MenuItem onClick={onConfigureMod}>Settings</MenuItem>
    ),
    mod.info.website == null ? null : (
      <MenuItem onClick={onOpenWebsite}>Website</MenuItem>
    ),
  ].filter(Boolean);

  return (
    <Draggable draggableId={mod.id} index={index}>
      {(providedDraggable) => (
        <div
          ref={providedDraggable.innerRef}
          {...providedDraggable.draggableProps}
          {...providedDraggable.dragHandleProps}
        >
          <ListItem
            key={mod.id}
            disablePadding={true}
            secondaryAction={[
              mod.info.config == null ? null : (
                <IconButton
                  key="settings"
                  edge="end"
                  aria-label="Settings"
                  onClick={onConfigureMod}
                >
                  <SettingsIcon />
                </IconButton>
              ),
              menuOptions.length == null ? null : (
                <IconButton
                  key="menu"
                  edge="end"
                  aria-label="Menu"
                  onClick={onOpenMenu}
                >
                  <MenuIcon />
                </IconButton>
              ),
            ]
              .filter(Boolean)
              .reduce(
                (agg, el) => (
                  <>
                    {agg}&nbsp;&nbsp;&nbsp;&nbsp;{el}
                  </>
                ),
                null
              )}
          >
            <Tooltip title={mod.info.description ?? ''} arrow={true}>
              <ListItemButton onClick={() => onToggleMod(mod)}>
                <ListItemIcon>
                  <Checkbox
                    edge="start"
                    checked={isEnabled}
                    tabIndex={-1}
                    disableRipple={true}
                    inputProps={{
                      'aria-labelledby': labelId,
                    }}
                  />
                </ListItemIcon>
                <ListItemText
                  id={labelId}
                  primary={mod.info.name}
                  secondary={[
                    mod.info.version == null
                      ? null
                      : `Version ${mod.info.version}`,
                    mod.info.author == null ? null : `by ${mod.info.author}`,
                  ].join(' ')}
                />
              </ListItemButton>
            </Tooltip>
          </ListItem>
          <Menu
            anchorEl={anchorEl}
            open={anchorEl != null}
            onClose={onCloseMenu}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
          >
            {menuOptions}
          </Menu>
        </div>
      )}
    </Draggable>
  );
}
