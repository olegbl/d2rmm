import { Box, ButtonGroup, Divider, List } from '@mui/material';
import { useCallback } from 'react';
import { DragDropContext, Droppable, DropResult } from 'react-beautiful-dnd';
import ModListItem from './ModListItem';
import { useEnabledMods, useOrderedMods } from './ModsContext';
import ModSettingsDrawer from './ModSettingsDrawer';
import RunGameButton from './RunGameButton';
import RefreshModsButton from './RefreshModsButton';
import ModInstallButton from './ModInstallButton';
import { usePreferences } from './Preferences';

type Props = {
  onShowLogsTab: () => unknown;
};

export default function ModList({ onShowLogsTab }: Props): JSX.Element {
  const [orderedMods, reorderMod] = useOrderedMods();
  const [enabledMods] = useEnabledMods();
  const { isDirectMode } = usePreferences();

  const onDragEnd = useCallback(
    ({ source, destination }: DropResult): void => {
      const from = source.index;
      const to = destination?.index;
      if (to != null) {
        reorderMod(from, to);
      }
    },
    [reorderMod]
  );

  return (
    <>
      <List
        sx={{ width: '100%', flex: 1, overflow: 'auto' }}
        disablePadding={true}
        dense={true}
      >
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable direction="vertical" droppableId="mods">
            {(providedDroppable) => (
              <div
                {...providedDroppable.droppableProps}
                ref={providedDroppable.innerRef}
              >
                {orderedMods.map((mod, index) => (
                  <ModListItem
                    key={mod.id}
                    mod={mod}
                    index={index}
                    isEnabled={enabledMods[mod.id] ?? false}
                  />
                ))}
                {providedDroppable.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </List>
      <Divider />
      <Box sx={{ display: 'flex', p: 1 }}>
        <Box sx={{ flexGrow: 1, flexShrink: 1 }} />
        <ButtonGroup variant="outlined">
          <RunGameButton />
          <RefreshModsButton />
          {isDirectMode ? (
            <ModInstallButton
              isUninstall={true}
              onErrorsEncountered={onShowLogsTab}
              orderedMods={orderedMods}
              tooltip="Revert any files modified by the enabled mods back to their vanilla state."
            />
          ) : null}
          <ModInstallButton
            orderedMods={orderedMods}
            onErrorsEncountered={onShowLogsTab}
          />
        </ButtonGroup>
      </Box>
      <ModSettingsDrawer />
    </>
  );
}
