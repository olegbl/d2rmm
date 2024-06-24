import { useCallback, useState } from 'react';
import { DragDropContext, Droppable, DropResult } from 'react-beautiful-dnd';
import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  ButtonGroup,
  Divider,
  InputAdornment,
  List,
  TextField,
} from '@mui/material';
import ModInstallButton from './ModInstallButton';
import ModListItem from './ModListItem';
import ModSettingsDrawer from './ModSettingsDrawer';
import { useEnabledMods, useOrderedMods } from './ModsContext';
import { usePreferences } from './Preferences';
import RefreshModsButton from './RefreshModsButton';
import RunGameButton from './RunGameButton';

export default function ModList(): JSX.Element {
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
    [reorderMod],
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
        dense={true}
        disablePadding={true}
        sx={{ width: '100%', flex: 1, overflow: 'auto' }}
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
          hiddenLabel={true}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Search..."
          size="small"
          sx={{
            flex: '0 1 auto',
            display: 'flex',
            flexDirection: 'row',
            '& .MuiInputBase-root': {
              width: '150px',
              transition: 'width ease-in-out 0.35s 0s',
              '&.Mui-focused': {
                width: '600px',
              },
            },
          }}
          value={filter}
          variant="outlined"
        />
        <Box sx={{ flex: '1 1 0', ml: 1 }} />
        <ButtonGroup sx={{ flex: '0 0 auto' }} variant="outlined">
          <RunGameButton />
          <RefreshModsButton />
          {isDirectMode ? (
            <ModInstallButton
              isUninstall={true}
              tooltip="Revert any files modified by the enabled mods back to their vanilla state."
            />
          ) : null}
          <ModInstallButton />
        </ButtonGroup>
      </Box>
      <ModSettingsDrawer />
    </>
  );
}
