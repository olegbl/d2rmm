import {
  ISectionHeader,
  useRemoveSectionHeader,
  useRenameSectionHeader,
  useToggleSectionHeader,
} from 'renderer/react/context/ModsContext';
import { MouseEvent, useCallback, useState } from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { Close, DragIndicator, Edit, ExpandMore } from '@mui/icons-material';
import {
  Box,
  Chip,
  IconButton,
  Input,
  ListItem,
  ListItemButton,
  ListItemText,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';

type Props = {
  enabledCount: number;
  index: number;
  sectionHeader: ISectionHeader;
  totalCount: number;
};

export default function ModListSectionHeader({
  enabledCount,
  index,
  sectionHeader,
  totalCount,
}: Props) {
  const theme = useTheme();

  // TODO: scroll list to end if needed on expand
  const onToggle = useToggleSectionHeader(sectionHeader.id);
  const onDelete = useRemoveSectionHeader(sectionHeader.id);
  const onRename = useRenameSectionHeader(sectionHeader.id);

  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(sectionHeader.label);
  const onStartRenaming = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      event.preventDefault();
      event.stopPropagation();
      setIsEditing(true);
    },
    [],
  );
  const onSubmitRenaming = useCallback(() => {
    setIsEditing(false);
    onRename(newName);
  }, [newName, onRename]);
  const onCancelRenaming = useCallback(() => {
    setIsEditing(false);
    setNewName(sectionHeader.label);
  }, [sectionHeader.label]);

  // TODO: bug: focus highlight stays on after blur when renaming

  return (
    <Draggable draggableId={sectionHeader.id} index={index}>
      {(providedDraggable) => (
        <div
          ref={providedDraggable.innerRef}
          {...providedDraggable.draggableProps}
          {...providedDraggable.dragHandleProps}
        >
          <ListItem
            disablePadding={true}
            sx={{ backgroundColor: theme.palette.action.hover }}
          >
            <ListItemButton
              disableRipple={isEditing}
              focusRipple={false}
              onClick={isEditing ? undefined : onToggle}
              sx={{
                width: 'auto',
                flexGrow: 1,
                flexShrink: 1,
                height: 48,
              }}
            >
              <ListItemText
                primary={
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <Box
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: sectionHeader.isExpanded
                          ? 'rotate(180deg)'
                          : 'rotate(0deg)',
                        transition:
                          'transform 150ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
                        color: theme.palette.action.active,
                      }}
                    >
                      <ExpandMore />
                    </Box>
                    {isEditing ? (
                      <Input
                        autoFocus={true}
                        onBlur={onCancelRenaming}
                        onChange={(event) => {
                          setNewName(event.target.value);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Escape') {
                            onCancelRenaming();
                          }
                          if (event.key === 'Enter') {
                            onSubmitRenaming();
                          }
                        }}
                        onSubmit={onSubmitRenaming}
                        sx={{ flex: 1, marginLeft: 1 }}
                        value={newName}
                      />
                    ) : (
                      <Typography sx={{ marginLeft: 1 }}>
                        {sectionHeader.label}
                      </Typography>
                    )}
                    {!isEditing && (
                      <>
                        <Chip
                          color="default"
                          label={`${enabledCount} / ${totalCount}`}
                          size="small"
                          sx={{ ml: 1 }}
                        />
                        <Box sx={{ flex: 1 }} />
                        <Tooltip title="Rename Section Header">
                          <IconButton onClick={onStartRenaming}>
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Section Header">
                          <IconButton onClick={onDelete}>
                            <Close />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </Box>
                }
              />
            </ListItemButton>
            <DragIndicator color="disabled" />
          </ListItem>
        </div>
      )}
    </Draggable>
  );
}
