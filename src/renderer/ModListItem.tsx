import {
  Box,
  Checkbox,
  Chip,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material';
import UpdateIcon from '@mui/icons-material/Update';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import FaceIcon from '@mui/icons-material/Face';
import LinkIcon from '@mui/icons-material/Link';
import HelpIcon from '@mui/icons-material/Help';
import SettingsIcon from '@mui/icons-material/Settings';
import { useCallback, useMemo } from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { useSelectedMod, useToggleMod } from './ModsContext';

const API = window.electron.API;

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
      color={color}
      icon={icon}
      label={label}
      size="small"
      clickable={onClick != null}
      onClick={onClickWithoutPropagation}
      onMouseDown={onMouseDownWithoutPropagation}
      sx={{ ml: 1, cursor: 'pointer' }}
    />
  );

  if (tooltip != null) {
    return <Tooltip title={tooltip}>{chip}</Tooltip>;
  }

  return chip;
}

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
      API.openURL(mod.info.website);
    }
  }, [mod]);

  const labelId = `mod-label-${mod}`;

  const item = (
    <ListItem key={mod.id} disablePadding={true}>
      <ListItemButton
        onClick={() => onToggleMod(mod)}
        sx={{ width: 'auto', flexGrow: 1, flexShrink: 1 }}
      >
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
          primary={
            <Box sx={{ display: 'flex', flexDirection: 'row' }}>
              <Typography>{mod.info.name}</Typography>
              {mod.info.description == null ? null : (
                <Tooltip title={mod.info.description}>
                  <HelpIcon color="disabled" sx={{ ml: 1 }} />
                </Tooltip>
              )}
              <Box sx={{ flex: 1 }} />
              {mod.info.website == null ? null : (
                <ListChip
                  icon={<LinkIcon />}
                  label="site"
                  onClick={onOpenWebsite}
                />
              )}
              <ListChip icon={<FaceIcon />} label={mod.info.author} />
              <ListChip icon={<UpdateIcon />} label={`v${mod.info.version}`} />
              {mod.info.config == null ? null : (
                <ListChip
                  color={isEnabled ? 'primary' : undefined}
                  icon={<SettingsIcon />}
                  label="settings"
                  onClick={onConfigureMod}
                />
              )}
            </Box>
          }
        />
      </ListItemButton>
      {isReorderEnabled ? <DragIndicatorIcon color="disabled" /> : null}
    </ListItem>
  );

  if (isReorderEnabled) {
    return (
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
    );
  }

  return item;
}
