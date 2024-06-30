import { useCallback, useMemo, useState } from 'react';
import { Draggable } from 'react-beautiful-dnd';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import FaceIcon from '@mui/icons-material/Face';
import HelpIcon from '@mui/icons-material/Help';
import LinkIcon from '@mui/icons-material/Link';
import SettingsIcon from '@mui/icons-material/Settings';
import UpdateIcon from '@mui/icons-material/Update';
import WarningIcon from '@mui/icons-material/Warning';
import {
  Box,
  Checkbox,
  Chip,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from '@mui/material';
import type { Mod } from 'bridge/BridgeAPI';
import { IShellAPI } from 'bridge/ShellAPI';
import { consumeAPI } from '../../IPC';
import { useSelectedMod, useToggleMod } from '../context/ModsContext';

const ShellAPI = consumeAPI<IShellAPI>('ShellAPI');

type ContextMenuAnchor = { left: number; top: number };

function useContextMenu(): [
  contextMenuAnchor: ContextMenuAnchor | null,
  onOpenContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void,
  onCloseContextMenu: () => void,
] {
  const [contextMenuAnchor, setContextMenuAnchor] =
    useState<ContextMenuAnchor | null>(null);

  const onOpenContextMenu = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      setContextMenuAnchor((oldValue) =>
        oldValue == null
          ? {
              left: event.clientX + 2,
              top: event.clientY - 6,
            }
          : null,
      );
    },
    [],
  );

  const onCloseContextMenu = useCallback(() => {
    setContextMenuAnchor(null);
  }, []);

  return [contextMenuAnchor, onOpenContextMenu, onCloseContextMenu];
}

function ListChip({
  color,
  icon,
  label,
  onClick,
  tooltip,
}: {
  color?: React.ComponentProps<typeof Chip>['color'];
  icon: React.ComponentProps<typeof Chip>['icon'];
  label: React.ComponentProps<typeof Chip>['label'];
  onClick?: React.ComponentProps<typeof Chip>['onClick'];
  tooltip?: string;
}): JSX.Element {
  const onClickWithoutPropagation = useMemo(() => {
    if (onClick == null) {
      return undefined;
    }
    return (event: React.MouseEvent<HTMLDivElement, MouseEvent>): void => {
      event.stopPropagation();
      onClick(event);
    };
  }, [onClick]);

  const onMouseDownWithoutPropagation = useMemo(() => {
    if (onClick == null || tooltip != null) {
      return undefined;
    }
    return (event: React.MouseEvent<HTMLDivElement, MouseEvent>): void => {
      event.stopPropagation();
    };
  }, [onClick, tooltip]);

  const chip = (
    <Chip
      clickable={onClick != null}
      color={color}
      icon={icon}
      label={label}
      onClick={onClickWithoutPropagation}
      onMouseDown={onMouseDownWithoutPropagation}
      size="small"
      sx={{ ml: 1, cursor: 'pointer' }}
    />
  );

  if (tooltip != null) {
    return <Tooltip title={tooltip}>{chip}</Tooltip>;
  }

  return chip;
}

type Action = {
  id: string;
  icon: React.ComponentProps<typeof Chip>['icon'];
  shortLabel?: string | null;
  longLabel?: string | null;
  color?: React.ComponentProps<typeof Chip>['color'] | null;
  tooltip?: string | null;
  onClick?: (() => void) | null;
};

type Props = {
  index: number;
  isEnabled: boolean;
  isReorderEnabled: boolean;
  mod: Mod;
};

export default function ModListItem({
  index,
  isEnabled,
  isReorderEnabled,
  mod,
}: Props) {
  const onToggleMod = useToggleMod();
  const [, setSelectedMod] = useSelectedMod();

  const onConfigureMod = useCallback((): void => {
    setSelectedMod(mod);
  }, [mod, setSelectedMod]);

  const onOpenWebsite = useCallback((): void => {
    if (mod.info.website != null) {
      ShellAPI.openExternal(mod.info.website).catch(console.error);
    }
  }, [mod]);

  const [contextMenuAnchor, onOpenContextMenu, onCloseContextMenu] =
    useContextMenu();

  const actions = [
    mod.info.website == null
      ? null
      : ({
          id: 'site',
          shortLabel: 'site',
          longLabel: 'Visit Website',
          icon: <LinkIcon />,
          onClick: onOpenWebsite,
        } as Action),
    mod.info.author == null
      ? null
      : ({
          id: 'author',
          shortLabel: mod.info.author,
          icon: <FaceIcon />,
        } as Action),
    mod.info.version == null
      ? null
      : ({
          id: 'version',
          shortLabel: `v${mod.info.version}`,
          icon: <UpdateIcon />,
        } as Action),
    mod.info.config == null
      ? null
      : ({
          id: 'settings',
          shortLabel: 'settings',
          longLabel: 'Open Settings',
          color: isEnabled ? 'primary' : undefined,
          icon: <SettingsIcon />,
          onClick: onConfigureMod,
        } as Action),
    mod.info.type !== 'data'
      ? null
      : ({
          id: 'datamod',
          shortLabel: 'data mod',
          color: 'warning',
          tooltip:
            'This mod is a non-D2RMM data mod and may conflict with other mods or game updates.',
          icon: <WarningIcon />,
          onClick: onOpenWebsite,
        } as Action),
  ].filter<Action>((action: Action | null): action is Action => action != null);

  const chipActions = actions.filter((action) => action.shortLabel != null);
  const contextActions = actions.filter((action) => action.longLabel != null);

  const labelId = `mod-label-${mod}`;

  const item = (
    <ListItem key={mod.id} disablePadding={true}>
      <ListItemButton
        onClick={() => onToggleMod(mod)}
        onContextMenu={
          contextActions.length === 0 ? undefined : onOpenContextMenu
        }
        sx={{ width: 'auto', flexGrow: 1, flexShrink: 1 }}
      >
        <ListItemIcon>
          <Checkbox
            checked={isEnabled}
            disableRipple={true}
            edge="start"
            inputProps={{
              'aria-labelledby': labelId,
            }}
            tabIndex={-1}
          />
        </ListItemIcon>
        <ListItemText
          id={labelId}
          primary={
            <Box sx={{ display: 'flex', flexDirection: 'row' }}>
              <Typography>{mod.info.name}</Typography>
              {mod.info.description == null ? null : (
                <Tooltip title={mod.info.description}>
                  <HelpIcon color="disabled" sx={{ ml: 1 }} />
                </Tooltip>
              )}
              <Box sx={{ flex: 1 }} />
              {chipActions.map((action) => (
                <ListChip
                  key={action.id}
                  color={action.color ?? undefined}
                  icon={action.icon}
                  label={action.shortLabel}
                  onClick={action.onClick ?? undefined}
                  tooltip={action.tooltip ?? undefined}
                />
              ))}
            </Box>
          }
        />
      </ListItemButton>
      {isReorderEnabled ? <DragIndicatorIcon color="disabled" /> : null}
    </ListItem>
  );

  return (
    <>
      {isReorderEnabled ? (
        <Draggable draggableId={mod.id} index={index}>
          {(providedDraggable) => (
            <div
              ref={providedDraggable.innerRef}
              {...providedDraggable.draggableProps}
              {...providedDraggable.dragHandleProps}
            >
              {item}
            </div>
          )}
        </Draggable>
      ) : (
        item
      )}
      {contextActions.length === 0 ? null : (
        <Menu
          anchorPosition={contextMenuAnchor ?? undefined}
          anchorReference="anchorPosition"
          onClose={onCloseContextMenu}
          open={contextMenuAnchor != null}
        >
          {contextActions.map((action) => (
            <MenuItem
              key={action.id}
              onClick={() => {
                onCloseContextMenu();
                action.onClick?.();
              }}
            >
              {action.longLabel}
            </MenuItem>
          ))}
        </Menu>
      )}
    </>
  );
}
