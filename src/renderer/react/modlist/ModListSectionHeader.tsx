import { MouseEvent, useCallback, useState } from 'react';
import { Draggable } from 'react-beautiful-dnd';
import {
  ChevronRight,
  Close,
  DragIndicator,
  Edit,
  ExpandMore,
} from '@mui/icons-material';
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
import {
  ISectionHeader,
  useRemoveSectionHeader,
  useRenameSectionHeader,
  useToggleSectionHeader,
} from '../context/ModsContext';

type Props = {
  count: number;
  index: number;
  sectionHeader: ISectionHeader;
};

export default function ModListSectionHeader({
  count,
  index,
  sectionHeader,
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
            sx={{ backgroundColor: theme.palette.divider }}
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
                    {sectionHeader.isExpanded ? (
                      <ExpandMore />
                    ) : (
                      <ChevronRight />
                    )}
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
                          label={count}
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
