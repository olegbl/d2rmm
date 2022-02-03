import { Settings } from '@mui/icons-material';
import {
  Checkbox,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { useCallback } from 'react';
import {
  DragDropContext,
  Draggable,
  Droppable,
  DropResult,
} from 'react-beautiful-dnd';
import { EnabledMods } from './useEnabledMods';

type Props = {
  enabledMods: EnabledMods;
  mods: Mod[];
  onConfigureMod: (mod: Mod) => unknown;
  onReorderMod: (from: number, to: number) => unknown;
  onToggleMod: (mod: Mod) => unknown;
};

export default function ModList({
  enabledMods,
  mods,
  onConfigureMod,
  onReorderMod,
  onToggleMod,
}: Props): JSX.Element {
  const onDragEnd = useCallback(
    ({ source, destination }: DropResult): void => {
      const from = source.index;
      const to = destination?.index;
      if (to != null) {
        onReorderMod(from, to);
      }
    },
    [onReorderMod]
  );

  return (
    <List sx={{ width: '100%', flex: 1 }}>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable direction="vertical" droppableId="mods">
          {(providedDroppable) => (
            <div
              {...providedDroppable.droppableProps}
              ref={providedDroppable.innerRef}
            >
              {mods.map((mod, index) => {
                const labelId = `mod-label-${mod}`;

                return (
                  <Draggable key={mod.id} draggableId={mod.id} index={index}>
                    {(providedDraggable) => (
                      <div
                        ref={providedDraggable.innerRef}
                        {...providedDraggable.draggableProps}
                        {...providedDraggable.dragHandleProps}
                      >
                        <ListItem
                          key={mod.id}
                          disablePadding={true}
                          secondaryAction={
                            mod.info.config == null ? null : (
                              <IconButton
                                edge="end"
                                aria-label="Settings"
                                onClick={() => onConfigureMod(mod)}
                              >
                                <Settings />
                              </IconButton>
                            )
                          }
                        >
                          <ListItemButton
                            role={undefined}
                            onClick={() => onToggleMod(mod)}
                            dense={true}
                          >
                            <ListItemIcon>
                              <Checkbox
                                edge="start"
                                checked={enabledMods[mod.id] ?? false}
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
                              secondary={
                                mod.info.author == null
                                  ? null
                                  : `by ${mod.info.author}`
                              }
                            />
                          </ListItemButton>
                        </ListItem>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {providedDroppable.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </List>
  );
}
