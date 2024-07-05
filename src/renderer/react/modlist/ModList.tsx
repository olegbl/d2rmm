import { isOrderedSectionHeader } from 'renderer/react/ReorderUtils';
import { useIsDirectMode } from 'renderer/react/context/IsDirectModeContext';
import {
  useEnabledMods,
  useOrdereredItems,
} from 'renderer/react/context/ModsContext';
import ModInstallButton from 'renderer/react/modlist/ModInstallButton';
import ModListItem from 'renderer/react/modlist/ModListItem';
import ModListSectionHeader from 'renderer/react/modlist/ModListSectionHeader';
import OverflowActionsButton from 'renderer/react/modlist/OverflowActionsButton';
import RunGameButton from 'renderer/react/modlist/RunGameButton';
import ModSettingsDrawer from 'renderer/react/settings/ModSettingsDrawer';
import {
  ChangeEvent,
  useCallback,
  useMemo,
  useState,
  useTransition,
} from 'react';
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

export default function ModList(): JSX.Element {
  const [, startTransition] = useTransition();
  const [orderedItems, reorderItems] = useOrdereredItems();
  const [enabledMods] = useEnabledMods();
  const [isDirectMode] = useIsDirectMode();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  const onChangeSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(event.target.value);
      startTransition(() => {
        setSearchFilter(event.target.value);
      });
    },
    [],
  );

  const onDragEnd = useCallback(
    ({ source, destination }: DropResult): void => {
      const from = source.index;
      const to = destination?.index;
      if (to != null) {
        reorderItems(from, to);
      }
    },
    [reorderItems],
  );

  const isReorderEnabled = searchFilter === '';

  const filteredItems = useMemo(
    () =>
      orderedItems
        // filter by search query
        .filter(
          (item) =>
            searchFilter === '' ||
            (item.type === 'mod' &&
              item.mod.info.name.toLowerCase().includes(searchFilter)),
        )
        // filter by section header
        .filter((item, index, array) => {
          if (isOrderedSectionHeader(item)) {
            return true;
          }
          for (let i = index - 1; i >= 0; i--) {
            const previousItem = array[i];
            if (isOrderedSectionHeader(previousItem)) {
              return previousItem.sectionHeader.isExpanded;
            }
          }
          return true;
        }),
    [searchFilter, orderedItems],
  );

  const renderedItems = useMemo(
    () =>
      filteredItems
        .map((item, index) => {
          if (item.type === 'sectionHeader') {
            const realIndex = orderedItems.findIndex((i) => i.id === item.id);
            const followingItems = orderedItems.slice(realIndex + 1);
            const count = followingItems.findIndex(isOrderedSectionHeader);
            const children =
              count === -1 ? followingItems : followingItems.slice(0, count);
            const enabledChildren = children.filter(
              (child) => enabledMods[child.id],
            );
            return (
              <ModListSectionHeader
                key={item.sectionHeader.id}
                enabledCount={enabledChildren.length}
                index={index}
                sectionHeader={item.sectionHeader}
                totalCount={children.length}
              />
            );
          }
          return (
            <ModListItem
              key={item.mod.id}
              index={index}
              isEnabled={enabledMods[item.mod.id] ?? false}
              isReorderEnabled={isReorderEnabled}
              mod={item.mod}
            />
          );
        })
        .filter(Boolean),
    [enabledMods, filteredItems, orderedItems, isReorderEnabled],
  );

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
                  {renderedItems}
                  {providedDroppable.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          renderedItems
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
          onChange={onChangeSearchQuery}
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
          value={searchQuery}
          variant="outlined"
        />
        <Box sx={{ flex: '1 1 0', ml: 1 }} />
        <ButtonGroup sx={{ flex: '0 0 auto' }} variant="outlined">
          <RunGameButton />
          {isDirectMode ? (
            <ModInstallButton
              isUninstall={true}
              tooltip="Revert any files modified by the enabled mods back to their vanilla state."
            />
          ) : null}
          <ModInstallButton />
          <OverflowActionsButton />
        </ButtonGroup>
      </Box>
      <ModSettingsDrawer />
    </>
  );
}
