import { Box, ButtonGroup, Divider, List, TextField } from '@mui/material';
import { useCallback, useState } from 'react';
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

  const [filter, setFilter] = useState('');

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

  const isReorderEnabled = filter === '';

  const items = orderedMods
    .filter((mod) => mod.info.name.toLowerCase().includes(filter))
    .map((mod, index) => (
      <ModListItem
        key={mod.id}
        index={index}
        isEnabled={enabledMods[mod.id] ?? false}
        isReorderEnabled={isReorderEnabled}
        mod={mod}
      />
    ));

  return (
    <>
      <List
        sx={{ width: '100%', flex: 1, overflow: 'auto' }}
        disablePadding={true}
        dense={true}
      >
        {isReorderEnabled ? (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable direction="vertical" droppableId="mods">
              {(providedDroppable) => (
                <div
                  {...providedDroppable.droppableProps}
                  ref={providedDroppable.innerRef}
                >
                  {items}
                  {providedDroppable.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          items
        )}
      </List>
      <Divider />
      <Box sx={{ display: 'flex', flexDirection: 'row', p: 1 }}>
        <TextField
          size="small"
          variant="filled"
          label="Search..."
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
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
