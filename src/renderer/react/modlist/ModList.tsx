import { getAppPath } from 'renderer/AppInfoAPI';
import ShellAPI from 'renderer/ShellAPI';
import { isOrderedSectionHeader } from 'renderer/react/ReorderUtils';
import { useIsDirectMode } from 'renderer/react/context/IsDirectModeContext';
import {
  useEnabledMods,
  useMods,
  useOrdereredItems,
} from 'renderer/react/context/ModsContext';
import ModInstallButton from 'renderer/react/modlist/ModInstallButton';
import ModListItem from 'renderer/react/modlist/ModListItem';
import ModListSectionHeader from 'renderer/react/modlist/ModListSectionHeader';
import OverflowActionsButton from 'renderer/react/modlist/OverflowActionsButton';
import RunGameButton from 'renderer/react/modlist/RunGameButton';
import ModSettingsDrawer from 'renderer/react/settings/ModSettingsDrawer';
import resolvePath from 'renderer/utils/resolvePath';
import {
  ChangeEvent,
  useCallback,
  useMemo,
  useState,
  useTransition,
} from 'react';
import { DragDropContext, Droppable, DropResult } from 'react-beautiful-dnd';
import { useTranslation } from 'react-i18next';
import { Refresh } from '@mui/icons-material';
import SearchIcon from '@mui/icons-material/Search';
import { LoadingButton } from '@mui/lab';
import {
  Box,
  ButtonGroup,
  Divider,
  InputAdornment,
  Link,
  List,
  TextField,
  Typography,
} from '@mui/material';

export default function ModList(): JSX.Element {
  const { t } = useTranslation();
  const [, startTransition] = useTransition();

  const modsPath = resolvePath(getAppPath(), 'mods', '');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [, onRefreshMods] = useMods();
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await onRefreshMods();
    setIsRefreshing(false);
  }, [onRefreshMods, setIsRefreshing]);

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
        {renderedItems.length === 0 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 1,
              color: 'text.secondary',
              p: 4,
            }}
          >
            <Typography variant="body1">{t('modlist.noMods')}</Typography>
            <Typography align="center" variant="body2">
              {t('modlist.noMods.findMods')}{' '}
              <Link
                href="https://www.nexusmods.com/games/diablo2resurrected/mods"
                rel="noopener noreferrer"
                target="_blank"
              >
                {t('modlist.noMods.nexusLink')}
              </Link>
              .<br />
              {t('modlist.noMods.extractInto')}{' '}
              <Link
                href="#"
                onClick={() => {
                  ShellAPI.showItemInFolder(modsPath).catch(console.error);
                }}
              >
                {modsPath}
              </Link>
              .
            </Typography>
            <LoadingButton
              loading={isRefreshing}
              loadingPosition="start"
              onClick={() => onRefresh().catch(console.error)}
              startIcon={<Refresh />}
              variant="contained"
            >
              {t('modlist.refresh')}
            </LoadingButton>
          </Box>
        )}
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
          placeholder={t('modlist.search')}
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
              tooltip={t('install.tooltip.uninstall')}
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
