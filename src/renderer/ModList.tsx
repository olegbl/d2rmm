import { List } from '@mui/material';
import { useCallback } from 'react';
import { DragDropContext, Droppable, DropResult } from 'react-beautiful-dnd';
import ModListItem from './ModListItem';
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
    <List
      sx={{ width: '100%', flex: 1, overflow: 'auto' }}
      disablePadding={true}
    >
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable direction="vertical" droppableId="mods">
          {(providedDroppable) => (
            <div
              {...providedDroppable.droppableProps}
              ref={providedDroppable.innerRef}
            >
              {mods.map((mod, index) => (
                <ModListItem
                  key={mod.id}
                  mod={mod}
                  index={index}
                  isEnabled={enabledMods[mod.id] ?? false}
                  onConfigureMod={onConfigureMod}
                  onToggleMod={onToggleMod}
                />
              ))}
              {providedDroppable.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </List>
  );
}
