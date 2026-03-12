import type { IInstallModsOptions } from 'bridge/BridgeAPI';
import type {
  IItem,
  IStashPage,
  IWaypointData,
  IWaypoints,
} from 'bridge/third-party/d2s/d2/types';
import BridgeAPI from 'renderer/BridgeAPI';
import { LocaleAPI } from 'renderer/LocaleAPI';
import ShellAPI from 'renderer/ShellAPI';
import ErrorBoundary from 'renderer/react/ErrorBoundary';
import { useDataPath } from 'renderer/react/context/DataPathContext';
import { useSanitizedGamePath } from 'renderer/react/context/GamePathContext';
import { useIsDirectMode } from 'renderer/react/context/IsDirectModeContext';
import { useIsPreExtractedData } from 'renderer/react/context/IsPreExtractedDataContext';
import { useOutputModName } from 'renderer/react/context/OutputModNameContext';
import { useOutputPath } from 'renderer/react/context/OutputPathContext';
import { usePreExtractedDataPath } from 'renderer/react/context/PreExtractedDataPathContext';
import { useFinalSavesPath } from 'renderer/react/context/SavesPathContext';
import useSessionState from 'renderer/react/context/SessionContext';
import { useClipboardContext } from 'renderer/react/ed2r/ED2RClipboardContext';
import {
  AltPositionID,
  CELL_SIZE,
  EquippedID,
  LocationID,
} from 'renderer/react/ed2r/ED2RConstants';
import {
  type GameData,
  useGameData,
} from 'renderer/react/ed2r/ED2RGameDataContext';
import {
  GameFiles,
  useGameFiles,
} from 'renderer/react/ed2r/ED2RGameFilesContext';
import {
  IItemPosition,
  getContainerItems,
  validateItemPlacement,
  useItemDragContext,
} from 'renderer/react/ed2r/ED2RItemDragContext';
import {
  getBeltItemPositionIn2D,
  getUniqueItemID,
  getUniqueItemPositionID,
} from 'renderer/react/ed2r/ED2RItemPosition';
import {
  enhanceCharacter,
  enhanceStashPage,
} from 'renderer/react/ed2r/ED2RSaveFileUtils';
import {
  CharacterFile,
  StashFile,
  useSaveFiles,
} from 'renderer/react/ed2r/ED2RSaveFilesContext';
import { useSelectedFileContext } from 'renderer/react/ed2r/ED2RSelectedFileContext';
import {
  StashTabContextProvider,
  useStashTabIndex,
} from 'renderer/react/ed2r/ED2RStashTabContext';
import { ItemDescription } from 'renderer/react/ed2r/components/ItemDescription';
import { getItemName, ItemName } from 'renderer/react/ed2r/components/ItemName';
import resolvePath from 'renderer/utils/resolvePath';
import { DragOverlay, useDroppable, useDraggable } from '@dnd-kit/core';
import { PropsOf } from '@emotion/react';
import {
  Fragment,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  Circle,
  Delete,
  Redo,
  Refresh,
  RefreshOutlined,
  Save,
  SaveOutlined,
  Undo,
} from '@mui/icons-material';
import { LoadingButton, TabContext, TabList, TabPanel } from '@mui/lab';
import {
  Box,
  Button,
  ButtonGroup,
  Checkbox,
  Divider,
  TextField,
  FormControlLabel,
  FormGroup,
  FormLabel,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListSubheader,
  Tab,
  Tooltip,
  TooltipProps,
  Typography,
  styled,
  tooltipClasses,
  Select,
  MenuItem,
  Menu,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';

const SORT_ORDER = ['stash', 'character'];

function useRuntimeOptions(): IInstallModsOptions {
  const dataPath = useDataPath();
  const gamePath = useSanitizedGamePath();
  const [isDirectMode] = useIsDirectMode();
  const [isPreExtractedData] = useIsPreExtractedData();
  const [preExtractedDataPath] = usePreExtractedDataPath();
  const [outputModName] = useOutputModName();
  const outputPath = useOutputPath();
  const savesPath = useFinalSavesPath();

  return {
    dataPath,
    gamePath,
    isDirectMode,
    isDryRun: false,
    isPreExtractedData,
    mergedPath: outputPath,
    outputModName,
    preExtractedDataPath,
    savesPath,
  };
}

export default function ED2R(): React.ReactNode {
  const { t } = useTranslation();
  const runtimeModOptions = useRuntimeOptions();

  const { setGameFiles } = useGameFiles();
  const {
    isLoaded,
    saveFiles,
    setSaveFiles,
    onChange,
    onCommit,
    onRevert,
    onReset,
    onUndo,
    onRedo,
  } = useSaveFiles();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Don't intercept Ctrl+Z/Y when focus is inside a text input.
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        onUndo();
      } else if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        onRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onUndo, onRedo]);
  const { selectedFile, selectedFileName, setSelectedFileName } =
    useSelectedFileContext();

  const fileList = Object.keys(saveFiles)
    .map((fileName) => saveFiles[fileName])
    .sort(
      (a, b) =>
        SORT_ORDER.indexOf(a.type) - SORT_ORDER.indexOf(b.type) ||
        a.fileName.localeCompare(b.fileName),
    );

  const [isLoading, setIsLoading] = useState(false);

  const onLoad = useCallback(async () => {
    setIsLoading(true);
    const { characters, stashes, gameFiles } =
      await BridgeAPI.readD2SData(runtimeModOptions);
    setIsLoading(false);

    // enhance parsed data with display metadata from game files
    for (const character of Object.values(characters)) {
      enhanceCharacter(character, gameFiles);
    }
    for (const stash of Object.values(stashes)) {
      for (const page of stash.pages) {
        enhanceStashPage(page, gameFiles);
      }
    }

    setGameFiles(gameFiles);
    setSaveFiles({
      ...Object.fromEntries(
        Object.entries(characters).map(([fileName, character]) => [
          fileName,
          {
            fileName,
            type: 'character',
            character,
            edited: false,
            readTime: Date.now(),
            saveTime: null,
          },
        ]),
      ),
      ...Object.fromEntries(
        Object.entries(stashes).map(([fileName, stash]) => [
          fileName,
          {
            fileName,
            type: 'stash',
            stash,
            edited: false,
            readTime: Date.now(),
            saveTime: null,
          },
        ]),
      ),
    });
  }, [runtimeModOptions, setGameFiles, setSaveFiles]);

  return (
    <>
      <Box sx={{ display: 'flex', height: '100%' }}>
        {isLoaded && (
          <Box
            sx={{
              width: 240,
              flexGrow: 0,
              flexShrink: 0,
              flexBasis: 'auto',
              overflowY: 'auto',
            }}
          >
            <List sx={{ padding: 0 }}>
              <ListSubheader sx={{ padding: 0, margin: 0 }}>
                <Box
                  sx={{
                    height: 48,
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: 1,
                    paddingRight: 1,
                  }}
                >
                  <Box sx={{ flex: '1 1 0' }} />
                  {isLoaded ? (
                    <Tooltip title={t('ed2r.tooltip.reload')}>
                      <IconButton
                        onClick={async () => {
                          // TODO: add confirmation modal if there are changes
                          onReset();
                          await onLoad();
                        }}
                        size="small"
                      >
                        <RefreshOutlined />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                </Box>
                <Divider />
              </ListSubheader>
              {fileList.map((file) => (
                <ListItem
                  key={file.fileName}
                  disablePadding={true}
                  onClick={() => setSelectedFileName(file.fileName)}
                  secondaryAction={
                    file.edited ? (
                      <Tooltip title={t('ed2r.tooltip.unsaved')}>
                        <IconButton disableRipple={true}>
                          <Circle
                            color="primary"
                            sx={{ width: 12, height: 12 }}
                          />
                        </IconButton>
                      </Tooltip>
                    ) : null
                  }
                >
                  <ListItemButton selected={file.fileName === selectedFileName}>
                    <ListItemText
                      primary={
                        // TODO: localize
                        file.type === 'character'
                          ? file.character.header.name
                          : file.type === 'stash'
                            ? file.fileName.startsWith('Modern')
                              ? file.fileName.includes('HardCore')
                                ? t('ed2r.stash.tab.rotw.hardcore')
                                : t('ed2r.stash.tab.rotw.softcore')
                              : file.fileName.includes('HardCore')
                                ? t('ed2r.stash.tab.lod.hardcore')
                                : t('ed2r.stash.tab.lod.softcore')
                            : t('ed2r.stash.tab.unknown')
                      }
                      secondary={file.fileName}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        )}
        {isLoaded && <Divider orientation="vertical" />}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
            flexShrink: 1,
            flexBasis: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {!isLoaded ? (
            <>
              <Box
                sx={{
                  width: '80%',
                  maxWidth: 680,
                  bgcolor: 'warning.main',
                  color: 'warning.contrastText',
                  p: 3,
                  borderRadius: 1,
                  boxShadow: 3,
                  textAlign: 'center',
                  mb: 2,
                }}
              >
                <Typography sx={{ fontWeight: 700 }} variant="h6">
                  {t('ed2r.warning.title')}
                </Typography>
                <Typography sx={{ mt: 1 }} variant="body2">
                  {t('ed2r.warning.body')}
                </Typography>
              </Box>
              <LoadingButton
                disabled={isLoading}
                loading={isLoading}
                onClick={onLoad}
                variant="contained"
              >
                {t('ed2r.loadSaveData')}
              </LoadingButton>
            </>
          ) : selectedFile == null ? (
            <Typography variant="body2">{t('ed2r.noFileSelected')}</Typography>
          ) : selectedFile.type === 'character' ? (
            <Character
              file={selectedFile}
              onChange={(file) => onChange({ ...file, edited: true })}
              onCommit={(file) =>
                onCommit({ ...file, edited: false, saveTime: Date.now() })
              }
              onRevert={() => onRevert(selectedFile)}
            />
          ) : selectedFile.type === 'stash' ? (
            <Stash
              file={selectedFile}
              onChange={(file) => onChange({ ...file, edited: true })}
              onCommit={(file) =>
                onCommit({ ...file, edited: false, saveTime: Date.now() })
              }
              onRevert={() => onRevert(selectedFile)}
            />
          ) : null}
        </Box>
      </Box>
      <DraggedItemOverlay />
    </>
  );
}

function DraggedItemOverlay() {
  const { draggedItem, hoveredPosition } = useItemDragContext();
  return (
    <DragOverlay
      style={{ pointerEvents: hoveredPosition == null ? 'none' : undefined }}
    >
      {draggedItem != null && (
        <InventoryItem
          height={draggedItem.inv_height}
          isDragging={false}
          isInOverlay={true}
          item={draggedItem}
          width={draggedItem.inv_width}
          x={draggedItem.position_x}
          y={draggedItem.position_y}
        />
      )}
    </DragOverlay>
  );
}

function TabPanelBox({
  children,
  value,
  sx,
}: {
  children: React.ReactNode;
  value: string;
  sx?: React.ComponentProps<typeof Box>['sx'];
}): React.ReactNode {
  return (
    <TabPanel sx={{ height: '100%', position: 'relative' }} value={value}>
      <Box
        sx={{
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          left: 0,
          position: 'absolute',
          right: 0,
          top: 0,
          ...sx,
        }}
      >
        <ErrorBoundary>{children}</ErrorBoundary>
      </Box>
    </TabPanel>
  );
}

function Stash({
  file,
  onChange,
  onCommit,
  onRevert,
}: {
  file: StashFile;
  onChange: (newValue: StashFile) => unknown;
  onCommit: (newValue: StashFile) => unknown;
  onRevert: () => unknown;
}): React.ReactNode {
  const { t } = useTranslation();
  const runtimeModOptions = useRuntimeOptions();
  const { canUndo, canRedo, onUndo, onRedo } = useSaveFiles();

  const savesPath = useFinalSavesPath();

  const [tab, setTab] = useSessionState<string | 'raw'>(
    `ED2R-selected-tab:${file.fileName}`,
    '0', // index of the selected stash tab
  );

  const tabIndices = new Array(file.stash.pageCount)
    .fill(null)
    .map((_value, index) => index);

  const handleDeleteTab = useCallback(
    (indexToDelete: number) => {
      if (file.stash.pageCount <= 3) {
        return; // Don't delete if we have 3 or fewer tabs
      }

      const newPages = file.stash.pages.filter(
        (_, index) => index !== indexToDelete,
      );
      const updatedFile: StashFile = {
        ...file,
        stash: {
          ...file.stash,
          pageCount: file.stash.pageCount - 1,
          pages: newPages,
        },
      };

      onChange(updatedFile);

      // If the deleted tab was the current tab or if it's the last tab, switch to previous
      const currentTabIndex = parseInt(tab, 10);
      if (
        currentTabIndex === indexToDelete ||
        currentTabIndex >= newPages.length
      ) {
        setTab(String(Math.max(0, newPages.length - 1)));
      }
    },
    [file, onChange, tab, setTab],
  );

  return (
    <TabContext value={tab}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            alignItems: 'center',
            contain: 'size',
            flex: '0 0 auto',
            height: 48,
            display: 'flex',
          }}
        >
          <TabList
            onChange={(_event, value) => setTab(value)}
            scrollButtons="auto"
            variant="scrollable"
          >
            {tabIndices
              .filter((index) => file.stash.pages[index] != null)
              .map((index) => (
                <Tab
                  key={index}
                  label={
                    file.stash.pages[index]?.sectionType === 1
                      ? t('ed2r.stash.tab.materials')
                      : file.stash.pages[index]?.sectionType === 2
                        ? t('ed2r.stash.tab.chronicle')
                        : index + 1
                  }
                  value={String(index)}
                />
              ))}
            <Tab label={t('ed2r.tab.raw')} value="raw" />
          </TabList>
        </Box>
        <Divider />
        {tabIndices.map((index) => (
          <StashTab
            key={index}
            file={file}
            index={index}
            onChange={onChange}
            onDelete={() => handleDeleteTab(index)}
          />
        ))}
        <TabPanelBox value="raw">
          <textarea
            readOnly={true}
            style={{
              width: '100%',
              flexGrow: 1,
              border: 'none',
              outline: 'none',
            }}
            value={JSON.stringify(file.stash, null, 2)}
          />
        </TabPanelBox>
        <Divider />
        <Box sx={{ display: 'flex', alignItems: 'center', p: 1 }}>
          <Typography variant="body2">
            {
              t('ed2r.fileLoaded', {
                fileName: '\x00',
                time: new Date(file.readTime).toLocaleTimeString(
                  LocaleAPI.getLocale(),
                ),
              }).split('\x00')[0]
            }
            <Link
              href="#"
              onClick={() => {
                ShellAPI.showItemInFolder(
                  resolvePath(savesPath, file.fileName),
                ).catch(console.error);
              }}
            >
              {file.fileName}
            </Link>
            {
              t('ed2r.fileLoaded', {
                fileName: '\x00',
                time: new Date(file.readTime).toLocaleTimeString(
                  LocaleAPI.getLocale(),
                ),
              }).split('\x00')[1]
            }
          </Typography>
          <Box sx={{ flex: '1 1 0' }} />
          <ButtonGroup sx={{ flex: '0 0 auto' }} variant="outlined">
            <Button disabled={!canUndo} onClick={onUndo} startIcon={<Undo />}>
              {t('ed2r.action.undo')}
            </Button>
            <Button disabled={!canRedo} onClick={onRedo} startIcon={<Redo />}>
              {t('ed2r.action.redo')}
            </Button>
            {file.edited ? (
              <Button
                onClick={() => {
                  // TODO: add confirmation modal
                  onRevert();
                }}
                startIcon={<Refresh />}
              >
                {t('ed2r.action.revert')}
              </Button>
            ) : null}
            <Button
              disabled={!file.edited}
              onClick={async () => {
                await BridgeAPI.writeSaveFile(
                  runtimeModOptions,
                  file.fileName,
                  file.stash,
                );
                onCommit(file);
              }}
              startIcon={file.edited ? <Save /> : <SaveOutlined />}
              variant={file.edited ? 'contained' : 'outlined'}
            >
              {t('ed2r.action.save')}
            </Button>
          </ButtonGroup>
        </Box>
      </Box>
    </TabContext>
  );
}

function StashTab({
  file,
  index,
  onDelete,
}: {
  file: StashFile;
  index: number;
  onChange: (newValue: StashFile) => unknown;
  onDelete: () => unknown;
}): React.ReactNode {
  const { t } = useTranslation();
  const { gameFiles } = useGameFiles();

  const page = file.stash.pages[index];

  if (page == null) {
    // this should never happen
    return (
      <TabPanelBox value={String(index)}>
        {t('ed2r.stash.pageNotFound')}
      </TabPanelBox>
    );
  }

  if (page.sectionType === 1) {
    return (
      <StashTabContextProvider index={index}>
        <TabPanelBox sx={{ overflow: 'auto' }} value={String(index)}>
          <AdvancedStashTab file={file} page={page} />
        </TabPanelBox>
      </StashTabContextProvider>
    );
  }

  const isExpansion = true; // Classic doesn't have shared stashes
  const inventory = gameFiles['global/excel/inventory.txt'] as TSVData;
  const inventoryRow = inventory.rows.find(
    (row) => row.class === (isExpansion ? 'Big Bank Page 1' : 'Bank Page 1'),
  );
  const width = +(inventoryRow?.gridX ?? (isExpansion ? 10 : 6));
  const height = +(inventoryRow?.gridY ?? (isExpansion ? 10 : 4));
  return (
    <StashTabContextProvider index={index}>
      <TabPanelBox sx={{ overflow: 'auto' }} value={String(index)}>
        <InventoryGrid
          altPositionID={AltPositionID.STASH}
          height={height}
          width={width}
        >
          {page.items
            .filter(
              (item) =>
                item.location_id === LocationID.NONE &&
                item.alt_position_id === AltPositionID.STASH,
            )
            .map((item) => (
              <InventoryGridItem
                key={`stashtab:${getUniqueItemID(item)}`}
                item={item}
              />
            ))}
        </InventoryGrid>
        {page.sectionType === 0 && (
          <span>
            <Tooltip title={t('ed2r.tooltip.deleteTab')}>
              <Button
                color="error"
                onClick={onDelete}
                sx={{ mt: 2 }}
                variant="contained"
              >
                <Delete fontSize="small" sx={{ mr: 1 }} />
                {t('ed2r.action.delete')}
              </Button>
            </Tooltip>
          </span>
        )}
      </TabPanelBox>
    </StashTabContextProvider>
  );
}

// Vanilla advanced stash item codes from bankexpansionlayouthd.json
const GEMS_GRID: string[][] = [
  // Columns: Diamond, Emerald, Ruby, Topaz, Amethyst, Sapphire, Skull
  // Rows: Chipped, Flawed, Regular, Flawless, Perfect
  ['gcw', 'gcg', 'gcr', 'gcy', 'gcv', 'gcb', 'skc'],
  ['gfw', 'gfg', 'gfr', 'gfy', 'gfv', 'gfb', 'skf'],
  ['gsw', 'gsg', 'gsr', 'gsy', 'gsv', 'gsb', 'sku'],
  ['glw', 'glg', 'glr', 'gly', 'gzv', 'glb', 'skl'],
  ['gpw', 'gpg', 'gpr', 'gpy', 'gpv', 'gpb', 'skz'],
];

const RUNES_GRID: string[][] = [
  ['r01', 'r02', 'r03', 'r04', 'r05', 'r06', 'r07', 'r08', 'r09', 'r10', 'r11'],
  ['r12', 'r13', 'r14', 'r15', 'r16', 'r17', 'r18', 'r19', 'r20', 'r21', 'r22'],
  ['r23', 'r24', 'r25', 'r26', 'r27', 'r28', 'r29', 'r30', 'r31', 'r32', 'r33'],
];

const MATERIALS_CODES: string[] = [
  'pk1',
  'pk2',
  'pk3',
  'ua1',
  'ua2',
  'ua3',
  'ua4',
  'ua5',
  'dhn',
  'bey',
  'mbr',
  'xa1',
  'xa2',
  'xa3',
  'xa4',
  'xa5',
  'rvs',
  'rvl',
  'toa',
  'tes',
  'ceh',
  'bet',
  'fed',
];

const ALL_VANILLA_CODES = new Set([
  ...GEMS_GRID.flat(),
  ...RUNES_GRID.flat(),
  ...MATERIALS_CODES,
]);

function AdvancedStashTab({
  file,
  page,
}: {
  file: StashFile;
  page: IStashPage;
}): React.ReactNode {
  const { gameFiles } = useGameFiles();

  // Build a map of item type code -> item for this page
  const itemsByType = useMemo(() => {
    const map = new Map<string, IItem>();
    for (const item of page.items) {
      map.set(item.type, item);
    }
    return map;
  }, [page.items]);

  // Find modded AdvancedStashStackable items from misc.txt
  const moddedCodes = useMemo(() => {
    const misc = gameFiles['global/excel/misc.txt'] as TSVData;
    if (misc == null) return [];
    return misc.rows
      .filter(
        (row) =>
          row.AdvancedStashStackable === '1' &&
          !ALL_VANILLA_CODES.has(row.code),
      )
      .map((row) => row.code)
      .filter(Boolean);
  }, [gameFiles]);

  // Also include any items in the page that aren't vanilla or known modded
  const unknownItems = useMemo(() => {
    const moddedSet = new Set(moddedCodes);
    return page.items.filter(
      (item) => !ALL_VANILLA_CODES.has(item.type) && !moddedSet.has(item.type),
    );
  }, [page.items, moddedCodes]);

  const allOtherCodes = useMemo(() => {
    const codes = [...moddedCodes];
    for (const item of unknownItems) {
      if (!codes.includes(item.type)) {
        codes.push(item.type);
      }
    }
    return codes;
  }, [moddedCodes, unknownItems]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', flexWrap: 'row', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: '2px' }}>
          {GEMS_GRID[0].map((_, colIdx) => (
            <Box
              key={colIdx}
              sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}
            >
              {GEMS_GRID.map((row, _rowIdx) => (
                <AdvancedStashSlot
                  key={row[colIdx]}
                  file={file}
                  item={itemsByType.get(row[colIdx])}
                  itemCode={row[colIdx]}
                />
              ))}
            </Box>
          ))}
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', flexWrap: 'row', gap: 2 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
              {['ua1', 'ua2', 'ua3', 'ua4', 'ua5'].map((code) => (
                <AdvancedStashSlot
                  key={code}
                  file={file}
                  height={2}
                  item={itemsByType.get(code)}
                  itemCode={code}
                />
              ))}
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
              {['pk1', 'pk2', 'pk3'].map((code) => (
                <AdvancedStashSlot
                  key={code}
                  file={file}
                  height={2}
                  item={itemsByType.get(code)}
                  itemCode={code}
                />
              ))}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'row', gap: 2 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
              {['xa1', 'xa2', 'xa3', 'xa4', 'xa5'].map((code) => (
                <AdvancedStashSlot
                  key={code}
                  file={file}
                  item={itemsByType.get(code)}
                  itemCode={code}
                />
              ))}
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
              {['dhn', 'bey', 'mbr'].map((code) => (
                <AdvancedStashSlot
                  key={code}
                  file={file}
                  item={itemsByType.get(code)}
                  itemCode={code}
                />
              ))}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'row', gap: 2 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
              {['toa', 'tes', 'ceh', 'bet', 'fed'].map((code) => (
                <AdvancedStashSlot
                  key={code}
                  file={file}
                  item={itemsByType.get(code)}
                  itemCode={code}
                />
              ))}
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
              {['rvs', 'rvl'].map((code) => (
                <AdvancedStashSlot
                  key={code}
                  file={file}
                  item={itemsByType.get(code)}
                  itemCode={code}
                />
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {RUNES_GRID.map((row, rowIdx) => (
          <Box key={rowIdx} sx={{ display: 'flex', gap: '2px' }}>
            {row.map((code) => (
              <AdvancedStashSlot
                key={code}
                file={file}
                item={itemsByType.get(code)}
                itemCode={code}
              />
            ))}
          </Box>
        ))}
      </Box>
      {allOtherCodes.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
          {allOtherCodes.map((code) => (
            <AdvancedStashSlot
              key={code}
              file={file}
              height={itemsByType.get(code)?.inv_height}
              item={itemsByType.get(code)}
              itemCode={code}
              width={itemsByType.get(code)?.inv_width}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

function AdvancedStashSlot({
  file,
  item,
  itemCode,
  width = 1,
  height = 1,
}: {
  file: StashFile;
  item?: IItem | null;
  itemCode: string;
  width?: number;
  height?: number;
}): React.ReactNode {
  const { gameFiles } = useGameFiles();
  const asset = (
    gameFiles['hd/items/items.json'] as {
      [assetID: string]: { asset: string };
    }[]
  ).find((entry) => entry[itemCode]?.asset)?.[itemCode]?.asset;
  const sprite = gameFiles[
    `hd/global/ui/items/misc/${asset}.lowend.sprite`
  ] as string;

  const quantity = item?.advanced_stash_quantity ?? 0;

  const stashTabIndex = useStashTabIndex();
  const { selectedFile } = useSelectedFileContext();

  const itemPosition = useMemo(
    () => ({
      acceptedItemType: itemCode,
      altPositionID: AltPositionID.STASH,
      equippedID: EquippedID.NONE,
      file: selectedFile ?? file,
      height,
      isAdvancedStash: true,
      isValid: true,
      locationID: LocationID.NONE,
      isMerc: false,
      stashTabIndex,
      width,
      x: 0,
      y: 0,
    }),
    [itemCode, file, selectedFile, stashTabIndex, width, height],
  );

  const itemPositionID = getUniqueItemPositionID(itemPosition);

  const { hoveredPosition } = useItemDragContext();
  const isHovered =
    hoveredPosition != null &&
    itemPositionID ===
      getUniqueItemPositionID({
        ...hoveredPosition,
        x: 0,
        y: 0,
        width,
        height,
      });

  const { setNodeRef } = useDroppable({
    id: `advslot:${itemCode}:${itemPositionID}`,
    data: {
      itemPosition,
      width,
      height,
    },
  });

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
  } = useDraggable({
    id: `advitem:${itemCode}:${itemPositionID}`,
    data: {
      item,
      itemPosition: item != null ? itemPosition : null,
    },
    disabled: item == null || quantity === 0,
  });

  const hoverColor =
    isHovered && hoveredPosition != null
      ? hoveredPosition.isValid
        ? 'rgba(0, 100, 255, 0.3)'
        : 'rgba(255, 0, 0, 0.3)'
      : undefined;

  const { t } = useTranslation();
  const { onChange } = useSaveFiles();
  const [contextMenuPos, setContextMenuPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [editQtyOpen, setEditQtyOpen] = useState(false);
  const [editQtyValue, setEditQtyValue] = useState('');

  const actualFile: StashFile =
    selectedFile?.type === 'stash' ? selectedFile : file;

  const handleContextMenu = (e: React.MouseEvent) => {
    if (item == null || quantity === 0) return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  const handleCloseMenu = () => setContextMenuPos(null);

  const handleDelete = () => {
    onChange({
      ...actualFile,
      stash: {
        ...actualFile.stash,
        pages: actualFile.stash.pages.map((page, index) =>
          index === stashTabIndex
            ? { ...page, items: page.items.filter((i) => i.type !== itemCode) }
            : page,
        ),
      },
      edited: true,
    });
    setContextMenuPos(null);
  };

  const handleOpenEditQty = () => {
    setEditQtyValue(String(quantity));
    setEditQtyOpen(true);
    setContextMenuPos(null);
  };

  const handleConfirmEditQty = () => {
    const newQty = parseInt(editQtyValue, 10);
    if (isNaN(newQty) || newQty < 0) return;
    onChange({
      ...actualFile,
      stash: {
        ...actualFile.stash,
        pages: actualFile.stash.pages.map((page, index) =>
          index === stashTabIndex
            ? {
                ...page,
                items:
                  newQty === 0
                    ? page.items.filter((i) => i.type !== itemCode)
                    : page.items.map((i) =>
                        i.type === itemCode
                          ? { ...i, advanced_stash_quantity: newQty }
                          : i,
                      ),
              }
            : page,
        ),
      },
      edited: true,
    });
    setEditQtyOpen(false);
  };

  return (
    <>
      <Box
        ref={(node: HTMLElement | null) => {
          setNodeRef(node);
          setDragRef(node);
        }}
        {...attributes}
        {...listeners}
        onContextMenu={handleContextMenu}
        sx={{
          position: 'relative',
          width: CELL_SIZE * width,
          height: CELL_SIZE * height,
          borderColor: 'primary',
          borderStyle: 'solid',
          borderWidth: 1,
          boxSizing: 'border-box',
          backgroundColor: hoverColor ?? 'transparent',
          cursor: item != null && quantity > 0 ? 'grab' : 'default',
          opacity: quantity > 0 ? 1 : 0.4,
        }}
      >
        {sprite != null && (
          <>
            <img
              src={sprite}
              style={{
                width: CELL_SIZE * width - 2,
                height: CELL_SIZE * height - 2,
                objectFit: 'none',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                bottom: 1,
                right: 3,
                color: 'white',
                fontSize: '11px',
                fontWeight: 'bold',
                textShadow:
                  '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
                lineHeight: 1,
                pointerEvents: 'none',
              }}
            >
              {quantity}
            </Box>
          </>
        )}
      </Box>
      <Menu
        anchorPosition={
          contextMenuPos != null
            ? { top: contextMenuPos.y, left: contextMenuPos.x }
            : undefined
        }
        anchorReference="anchorPosition"
        onClose={handleCloseMenu}
        open={contextMenuPos != null}
      >
        <MenuItem onClick={handleDelete}>{t('ed2r.action.delete')}</MenuItem>
        <MenuItem onClick={handleOpenEditQty}>
          {t('ed2r.item.editQty')}
        </MenuItem>
      </Menu>
      <Dialog onClose={() => setEditQtyOpen(false)} open={editQtyOpen}>
        <DialogTitle>{t('ed2r.item.editQty')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus={true}
            fullWidth={true}
            inputProps={{ min: 0 }}
            label={t('ed2r.item.quantity')}
            onChange={(e) => setEditQtyValue(e.target.value)}
            sx={{ mt: 1 }}
            type="number"
            value={editQtyValue}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditQtyOpen(false)}>
            {t('ed2r.action.cancel')}
          </Button>
          <Button onClick={handleConfirmEditQty} variant="contained">
            {t('ed2r.action.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

type CharaterTab =
  | 'basic'
  | 'cube'
  | 'equipment'
  | 'inventory'
  | 'mercenary'
  | 'raw'
  | 'skills'
  | 'stash'
  | 'waypoints';

function Character({
  file,
  onChange,
  onCommit,
  onRevert,
}: {
  file: CharacterFile;
  onChange: (newValue: CharacterFile) => unknown;
  onCommit: (newValue: CharacterFile) => unknown;
  onRevert: () => unknown;
}): React.ReactNode {
  const runtimeModOptions = useRuntimeOptions();

  const savesPath = useFinalSavesPath();

  const { t } = useTranslation();
  const { canUndo, canRedo, onUndo, onRedo } = useSaveFiles();
  const [tab, setTab] = useSessionState<CharaterTab>(
    `ED2R-selected-tab:${file.fileName}`,
    'basic',
  );

  return (
    <TabContext value={tab}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            alignItems: 'center',
            contain: 'size',
            flex: '0 0 auto',
            height: 48,
          }}
        >
          <TabList
            onChange={(_event, value) => setTab(value)}
            scrollButtons="auto"
            variant="scrollable"
          >
            <Tab label={t('ed2r.tab.basic')} value="basic" />
            <Tab label={t('ed2r.tab.skills')} value="skills" />
            <Tab label={t('ed2r.tab.equipment')} value="equipment" />
            <Tab label={t('ed2r.tab.inventory')} value="inventory" />
            <Tab label={t('ed2r.tab.stash')} value="stash" />
            <Tab label={t('ed2r.tab.cube')} value="cube" />
            <Tab label={t('ed2r.tab.mercenary')} value="mercenary" />
            <Tab label={t('ed2r.tab.waypoints')} value="waypoints" />
            <Tab label={t('ed2r.tab.raw')} value="raw" />
          </TabList>
        </Box>
        <Divider />
        <CharacterBasicTab file={file} onChange={onChange} />
        <CharacterSkillsTab file={file} onChange={onChange} />
        <CharacterEquipmentTab file={file} onChange={onChange} />
        <CharacterWaypointsTab file={file} onChange={onChange} />
        <CharacterInventoryTab file={file} onChange={onChange} />
        <CharacterStashTab file={file} onChange={onChange} />
        <CharacterCubeTab file={file} onChange={onChange} />
        <CharacterMercenaryTab file={file} onChange={onChange} />
        <TabPanelBox value="raw">
          <textarea
            readOnly={true}
            style={{
              width: '100%',
              flexGrow: 1,
              border: 'none',
              outline: 'none',
            }}
            value={JSON.stringify(file.character, null, 2)}
          />
        </TabPanelBox>
        <Divider />
        <Box sx={{ display: 'flex', alignItems: 'center', p: 1 }}>
          <Typography variant="body2">
            {
              t('ed2r.fileLoaded', {
                fileName: '\x00',
                time: new Date(file.readTime).toLocaleTimeString(
                  LocaleAPI.getLocale(),
                ),
              }).split('\x00')[0]
            }
            <Link
              href="#"
              onClick={() => {
                ShellAPI.showItemInFolder(
                  resolvePath(savesPath, file.fileName),
                ).catch(console.error);
              }}
            >
              {file.fileName}
            </Link>
            {
              t('ed2r.fileLoaded', {
                fileName: '\x00',
                time: new Date(file.readTime).toLocaleTimeString(
                  LocaleAPI.getLocale(),
                ),
              }).split('\x00')[1]
            }
          </Typography>
          <Box sx={{ flex: '1 1 0' }} />
          <ButtonGroup sx={{ flex: '0 0 auto' }} variant="outlined">
            <Button disabled={!canUndo} onClick={onUndo} startIcon={<Undo />}>
              {t('ed2r.action.undo')}
            </Button>
            <Button disabled={!canRedo} onClick={onRedo} startIcon={<Redo />}>
              {t('ed2r.action.redo')}
            </Button>
            {file.edited ? (
              <Button
                onClick={() => {
                  // TODO: add confirmation modal
                  onRevert();
                }}
                startIcon={<Refresh />}
              >
                {t('ed2r.action.revert')}
              </Button>
            ) : null}
            <Tooltip placement="top" title={t('ed2r.tooltip.backup')}>
              <span>
                <Button
                  disabled={!file.edited}
                  onClick={async () => {
                    await BridgeAPI.writeSaveFile(
                      runtimeModOptions,
                      file.fileName,
                      file.character,
                    );
                    onCommit(file);
                  }}
                  startIcon={file.edited ? <Save /> : <SaveOutlined />}
                  variant={file.edited ? 'contained' : 'outlined'}
                >
                  {t('ed2r.action.save')}
                </Button>
              </span>
            </Tooltip>
          </ButtonGroup>
        </Box>
      </Box>
    </TabContext>
  );
}

function CharacterEquipmentTab({
  file,
}: {
  file: CharacterFile;
  onChange: (newValue: CharacterFile) => unknown;
}) {
  // theoretically, these are controlled by "numboxes" in "belts.txt"
  // but is it even possible to increase than above 16?
  const width = 4;
  const height = 4;

  const { draggedItem } = useItemDragContext();
  const draggedItemID = draggedItem ? getUniqueItemID(draggedItem) : null;
  const notDragging = (item: IItem) =>
    draggedItemID == null || getUniqueItemID(item) !== draggedItemID;

  const rightHandItem = file.character.items.find(
    (item) =>
      item.location_id === LocationID.EQUIPPED &&
      item.equipped_id === EquippedID.RIGHT_HAND &&
      notDragging(item),
  );

  const rightHandItem2 = file.character.items.find(
    (item) =>
      item.location_id === LocationID.EQUIPPED &&
      item.equipped_id === EquippedID.ALT_RIGHT_HAND &&
      notDragging(item),
  );

  const handsItem = file.character.items.find(
    (item) =>
      item.location_id === LocationID.EQUIPPED &&
      item.equipped_id === EquippedID.HANDS &&
      notDragging(item),
  );

  const rightFingerItem = file.character.items.find(
    (item) =>
      item.location_id === LocationID.EQUIPPED &&
      item.equipped_id === EquippedID.RIGHT_FINGER &&
      notDragging(item),
  );

  const headItem = file.character.items.find(
    (item) =>
      item.location_id === LocationID.EQUIPPED &&
      item.equipped_id === EquippedID.HEAD &&
      notDragging(item),
  );

  const torsoItem = file.character.items.find(
    (item) =>
      item.location_id === LocationID.EQUIPPED &&
      item.equipped_id === EquippedID.TORSO &&
      notDragging(item),
  );

  const waistItem = file.character.items.find(
    (item) =>
      item.location_id === LocationID.EQUIPPED &&
      item.equipped_id === EquippedID.WAIST &&
      notDragging(item),
  );

  const neckItem = file.character.items.find(
    (item) =>
      item.location_id === LocationID.EQUIPPED &&
      item.equipped_id === EquippedID.NECK &&
      notDragging(item),
  );

  const leftFingerItem = file.character.items.find(
    (item) =>
      item.location_id === LocationID.EQUIPPED &&
      item.equipped_id === EquippedID.LEFT_FINGER &&
      notDragging(item),
  );

  const leftHandItem = file.character.items.find(
    (item) =>
      item.location_id === LocationID.EQUIPPED &&
      item.equipped_id === EquippedID.LEFT_HAND &&
      item !== rightHandItem &&
      notDragging(item),
  );

  const leftHandItem2 = file.character.items.find(
    (item) =>
      item.location_id === LocationID.EQUIPPED &&
      item.equipped_id === EquippedID.ALT_LEFT_HAND &&
      item !== rightHandItem2 &&
      notDragging(item),
  );

  const feetItem = file.character.items.find(
    (item) =>
      item.location_id === LocationID.EQUIPPED &&
      item.equipped_id === EquippedID.FEET &&
      notDragging(item),
  );

  return (
    <TabPanelBox sx={{ overflow: 'auto' }} value="equipment">
      <InventoryGrid
        equippedID={EquippedID.RIGHT_HAND}
        file={file}
        height={4}
        isSingleItemGrid={true}
        locationID={LocationID.EQUIPPED}
        width={2}
        x={0}
        y={0.25}
      >
        <InventoryGridItem
          height={4}
          item={rightHandItem}
          width={2}
          x={0}
          y={0}
        />
      </InventoryGrid>
      <InventoryGrid
        equippedID={EquippedID.HANDS}
        file={file}
        height={2}
        isSingleItemGrid={true}
        locationID={LocationID.EQUIPPED}
        width={2}
        x={0}
        y={4.5}
      >
        <InventoryGridItem height={2} item={handsItem} width={2} x={0} y={0} />
      </InventoryGrid>
      <InventoryGrid
        equippedID={EquippedID.RIGHT_FINGER}
        file={file}
        height={1}
        isSingleItemGrid={true}
        locationID={LocationID.EQUIPPED}
        width={1}
        x={2.25}
        y={5.5}
      >
        <InventoryGridItem
          height={1}
          item={rightFingerItem}
          width={1}
          x={0}
          y={0}
        />
      </InventoryGrid>
      <InventoryGrid
        equippedID={EquippedID.HEAD}
        file={file}
        height={2}
        isSingleItemGrid={true}
        locationID={LocationID.EQUIPPED}
        width={2}
        x={3.5}
        y={0}
      >
        <InventoryGridItem height={2} item={headItem} width={2} x={0} y={0} />
      </InventoryGrid>
      <InventoryGrid
        equippedID={EquippedID.TORSO}
        file={file}
        height={3}
        isSingleItemGrid={true}
        locationID={LocationID.EQUIPPED}
        width={2}
        x={3.5}
        y={2.25}
      >
        <InventoryGridItem height={3} item={torsoItem} width={2} x={0} y={0} />
      </InventoryGrid>
      <InventoryGrid
        equippedID={EquippedID.WAIST}
        file={file}
        height={1}
        isSingleItemGrid={true}
        locationID={LocationID.EQUIPPED}
        width={2}
        x={3.5}
        y={5.5}
      >
        <InventoryGridItem height={1} item={waistItem} width={2} x={0} y={0} />
      </InventoryGrid>
      <InventoryGrid
        equippedID={EquippedID.NECK}
        file={file}
        height={1}
        isSingleItemGrid={true}
        locationID={LocationID.EQUIPPED}
        width={1}
        x={5.75}
        y={2.25}
      >
        <InventoryGridItem height={1} item={neckItem} width={1} x={0} y={0} />
      </InventoryGrid>
      <InventoryGrid
        equippedID={EquippedID.LEFT_FINGER}
        file={file}
        height={1}
        isSingleItemGrid={true}
        locationID={LocationID.EQUIPPED}
        width={1}
        x={5.75}
        y={5.5}
      >
        <InventoryGridItem
          height={1}
          item={leftFingerItem}
          width={1}
          x={0}
          y={0}
        />
      </InventoryGrid>
      <InventoryGrid
        equippedID={EquippedID.LEFT_HAND}
        file={file}
        height={4}
        isSingleItemGrid={true}
        locationID={LocationID.EQUIPPED}
        width={2}
        x={7}
        y={0.25}
      >
        <InventoryGridItem
          height={4}
          item={leftHandItem}
          width={2}
          x={0}
          y={0}
        />
      </InventoryGrid>
      <InventoryGrid
        equippedID={EquippedID.FEET}
        file={file}
        height={2}
        isSingleItemGrid={true}
        locationID={LocationID.EQUIPPED}
        width={2}
        x={7}
        y={4.5}
      >
        <InventoryGridItem height={2} item={feetItem} width={2} x={0} y={0} />
      </InventoryGrid>
      <InventoryGrid
        file={file}
        height={height}
        locationID={LocationID.BELT}
        width={width}
        x={0}
        y={6.75}
      >
        {file.character.items
          .filter((item) => item.location_id === LocationID.BELT)
          .map((item) => (
            <InventoryGridItem
              key={getUniqueItemID(item)}
              item={item}
              {...getBeltItemPositionIn2D(item.position_x)}
            />
          ))}
      </InventoryGrid>
      <InventoryGrid
        equippedID={EquippedID.ALT_RIGHT_HAND}
        file={file}
        height={4}
        isSingleItemGrid={true}
        locationID={LocationID.EQUIPPED}
        width={2}
        x={4.75}
        y={6.75}
      >
        <InventoryGridItem
          height={4}
          item={rightHandItem2}
          width={2}
          x={0}
          y={0}
        />
      </InventoryGrid>
      <InventoryGrid
        equippedID={EquippedID.ALT_LEFT_HAND}
        file={file}
        height={4}
        isSingleItemGrid={true}
        locationID={LocationID.EQUIPPED}
        width={2}
        x={7}
        y={6.75}
      >
        <InventoryGridItem
          height={4}
          item={leftHandItem2}
          width={2}
          x={0}
          y={0}
        />
      </InventoryGrid>
    </TabPanelBox>
  );
}

function CharacterInventoryTab({
  file,
}: {
  file: CharacterFile;
  onChange: (newValue: CharacterFile) => unknown;
}): React.ReactNode {
  const { gameFiles } = useGameFiles();
  const { gameData } = useGameData();
  const isExpansion = file.character.header.status.expansion;
  const inventory = gameFiles['global/excel/inventory.txt'] as TSVData;
  const characterClass = gameData.classes[file.character.header.class_id].name;
  const inventoryRow = inventory.rows.find(
    (row) =>
      row.class === (isExpansion ? `${characterClass}2` : characterClass),
  );
  const width = +(inventoryRow?.gridX ?? 10);
  const height = +(inventoryRow?.gridY ?? 4);
  return (
    <TabPanelBox sx={{ overflow: 'auto' }} value="inventory">
      <InventoryGrid
        altPositionID={AltPositionID.INVENTORY}
        file={file}
        height={height}
        width={width}
      >
        {file.character.items
          .filter(
            (item) =>
              item.location_id === LocationID.NONE &&
              item.alt_position_id === AltPositionID.INVENTORY,
          )
          .map((item) => (
            <InventoryGridItem
              key={`characterinventorytab:item:${getUniqueItemID(item)}`}
              item={item}
            />
          ))}
      </InventoryGrid>
    </TabPanelBox>
  );
}

function CharacterStashTab({
  file,
}: {
  file: CharacterFile;
  onChange: (newValue: CharacterFile) => unknown;
}): React.ReactNode {
  const { gameFiles } = useGameFiles();
  const isExpansion = file.character.header.status.expansion;
  const inventory = gameFiles['global/excel/inventory.txt'] as TSVData;
  const inventoryRow = inventory.rows.find(
    (row) => row.class === (isExpansion ? 'Big Bank Page 1' : 'Bank Page 1'),
    // TODO: what are "Bank Page2" and "Big Bank Page2" for?
  );
  const width = +(inventoryRow?.gridX ?? (isExpansion ? 10 : 6));
  const height = +(inventoryRow?.gridY ?? (isExpansion ? 10 : 4));
  return (
    <TabPanelBox sx={{ overflow: 'auto' }} value="stash">
      <InventoryGrid
        altPositionID={AltPositionID.STASH}
        file={file}
        height={height}
        width={width}
      >
        {file.character.items
          .filter(
            (item) =>
              item.location_id === LocationID.NONE &&
              item.alt_position_id === AltPositionID.STASH,
          )
          .map((item) => (
            <InventoryGridItem
              key={`characterstashtab:${getUniqueItemID(item)}`}
              item={item}
            />
          ))}
      </InventoryGrid>
    </TabPanelBox>
  );
}

function CharacterCubeTab({
  file,
}: {
  file: CharacterFile;
  onChange: (newValue: CharacterFile) => unknown;
}): React.ReactNode {
  const { gameFiles } = useGameFiles();
  const isExpansion = file.character.header.status.expansion;
  const inventory = gameFiles['global/excel/inventory.txt'] as TSVData;
  const inventoryRow = inventory.rows.find(
    (row) =>
      row.class ===
      (isExpansion ? 'Transmogrify Box Page 1' : 'Transmogrify Box2'),
  );
  const width = +(inventoryRow?.gridX ?? 3);
  const height = +(inventoryRow?.gridY ?? 4);
  return (
    <TabPanelBox sx={{ overflow: 'auto' }} value="cube">
      <InventoryGrid
        altPositionID={AltPositionID.CUBE}
        file={file}
        height={height}
        width={width}
      >
        {file.character.items
          .filter(
            (item) =>
              item.location_id === LocationID.NONE &&
              item.alt_position_id === AltPositionID.CUBE,
          )
          .map((item) => (
            <InventoryGridItem
              key={`charactercubetab:${getUniqueItemID(item)}`}
              item={item}
            />
          ))}
      </InventoryGrid>
    </TabPanelBox>
  );
}

const InventoryGridItemTooltip = styled(
  ({ className, ...props }: TooltipProps) => (
    <Tooltip {...props} arrow={true} classes={{ popper: className }} />
  ),
)(({ theme }) => ({
  [`& .${tooltipClasses.arrow}`]: {
    color: theme.palette.common.black,
  },
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: theme.palette.common.black,
    maxWidth: 'none',
  },
}));

function getAssetIDFromIndex(index: string): string {
  return index.toLowerCase().replace(/'/g, '').replace(/ /g, '_');
}

function getAssetPath(item: IItem, gameFiles: GameFiles): null | string {
  const itemClass =
    item.item_quality == 'normal'
      ? 'normal'
      : item.item_quality == 'exceptional'
        ? 'uber'
        : item.item_quality == 'elite'
          ? 'ultra'
          : 'normal';

  if (item.unique_name != null) {
    const assetID = getAssetIDFromIndex(item.unique_name);
    for (const entry of gameFiles['hd/items/uniques.json'] as {
      [assetID: string]: { normal: string; uber: string; ultra: string };
    }[]) {
      if (entry[assetID] != null) {
        return entry[assetID][itemClass];
      }
    }
  }

  if (item.set_name != null) {
    const assetID = getAssetIDFromIndex(item.set_name);
    for (const entry of gameFiles['hd/items/sets.json'] as {
      [assetID: string]: { normal: string; uber: string; ultra: string };
    }[]) {
      if (entry[assetID] != null) {
        return entry[assetID][itemClass];
      }
    }
  }

  const assetID = item.type;
  for (const entry of gameFiles['hd/items/items.json'] as {
    [assetID: string]: { asset: string };
  }[]) {
    if (entry[assetID] != null) {
      return entry[assetID].asset;
    }
  }

  return null;
}

function getItemSprite(
  item: IItem,
  gameFiles: GameFiles,
  gameData: GameData,
): string {
  const assetPath = getAssetPath(item, gameFiles);
  const category =
    item.categories?.includes('Armor') || item.categories?.includes('Any Armor')
      ? 'armor'
      : item.categories?.includes('Weapon') ||
          item.categories?.includes('Any Weapon')
        ? 'weapon'
        : 'misc';
  const assetFilePaths = (
    item.multiple_pictures ? [item.picture_id + 1, ''] : ['']
  ).map(
    (suffix) =>
      `hd/global/ui/items/${category}/${assetPath}${suffix}.lowend.sprite`,
  );
  const asset = assetFilePaths
    .map((assetFilePath) => gameFiles[assetFilePath])
    .filter((value) => value != null)
    .shift();
  if (typeof asset !== 'string') {
    console.warn(
      `Could not find sprite for item "${getItemName(item, gameData)}" (${assetFilePaths[0]}).`,
      item,
    );
    // TODO: question mark or something if sprite is not found
    return '';
  }
  return asset;
}

function InventoryGridItem({
  height,
  item,
  width,
  x,
  y,
}: {
  height?: number;
  item?: IItem | null;
  width?: number;
  x?: number;
  y?: number;
}): React.ReactNode {
  const { selectedFile: file } = useSelectedFileContext();
  const stashTabIndex = useStashTabIndex();
  const itemPosition: IItemPosition | null = useMemo(() => {
    if (item == null || file == null) return null;
    const isMercItem =
      file.type === 'character' &&
      Array.isArray(file.character.merc_items) &&
      file.character.merc_items.some(
        (mi) => getUniqueItemID(mi) === getUniqueItemID(item),
      );
    return {
      altPositionID: item.alt_position_id,
      equippedID: item.equipped_id,
      file,
      height: item.inv_height,
      isValid: true,
      locationID: item.location_id,
      isMerc: isMercItem,
      stashTabIndex,
      width: item.inv_width,
      x: item.position_x,
      y: item.position_y,
    } as IItemPosition;
  }, [item, file, stashTabIndex]);

  const itemPositionID =
    itemPosition == null ? 'invalid' : getUniqueItemPositionID(itemPosition);

  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `item:${itemPositionID}`,
    data: {
      item,
      itemPosition,
    },
  });

  const { draggedItem } = useItemDragContext();
  const isDragging =
    (draggedItem == null ? null : getUniqueItemID(draggedItem)) ===
    (item == null ? null : getUniqueItemID(item));

  const { t } = useTranslation();
  const { onChange } = useSaveFiles();
  const { copyItem, cutItem } = useClipboardContext();
  const [contextMenuPos, setContextMenuPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  if (item == null) {
    return null;
  }

  x ??= item.position_x;
  y ??= item.position_y;
  width ??= item.inv_width;
  height ??= item.inv_height;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  const handleCloseMenu = () => setContextMenuPos(null);

  const handleCopy = () => {
    copyItem(item);
    setContextMenuPos(null);
  };

  const handleCut = () => {
    if (itemPosition == null) return;
    cutItem(item, itemPosition);
    setContextMenuPos(null);
  };

  const handleDelete = () => {
    if (file == null) return;
    const uniqueID = getUniqueItemID(item);
    if (file.type === 'character') {
      onChange({
        ...file,
        character: {
          ...file.character,
          items: file.character.items.filter(
            (i) => getUniqueItemID(i) !== uniqueID,
          ),
          merc_items: file.character.merc_items?.filter(
            (i) => getUniqueItemID(i) !== uniqueID,
          ),
        },
        edited: true,
      });
    } else {
      onChange({
        ...file,
        stash: {
          ...file.stash,
          pages: file.stash.pages.map((page, index) =>
            index === stashTabIndex
              ? {
                  ...page,
                  items: page.items.filter(
                    (i) => getUniqueItemID(i) !== uniqueID,
                  ),
                }
              : page,
          ),
        },
        edited: true,
      });
    }
    setContextMenuPos(null);
  };

  return (
    <>
      <InventoryGridItemTooltip
        title={
          <Box sx={{ padding: 2 }}>
            <Typography
              sx={{
                alignItems: 'center',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <ItemName item={item} />
              <ItemDescription item={item} />
            </Typography>
          </Box>
        }
      >
        <InventoryItem
          ref={setNodeRef}
          {...attributes}
          {...listeners}
          height={height}
          isDragging={isDragging}
          isInOverlay={false}
          item={item}
          onContextMenu={handleContextMenu}
          width={width}
          x={x}
          y={y}
        />
      </InventoryGridItemTooltip>
      <Menu
        anchorPosition={
          contextMenuPos != null
            ? { top: contextMenuPos.y, left: contextMenuPos.x }
            : undefined
        }
        anchorReference="anchorPosition"
        onClose={handleCloseMenu}
        open={contextMenuPos != null}
      >
        <MenuItem onClick={handleCopy}>{t('ed2r.action.copy')}</MenuItem>
        <MenuItem onClick={handleCut}>{t('ed2r.action.cut')}</MenuItem>
        <MenuItem onClick={handleDelete}>{t('ed2r.action.delete')}</MenuItem>
      </Menu>
    </>
  );
}

const InventoryItem = forwardRef(function InventoryItem(
  {
    height,
    isDragging,
    isInOverlay,
    item,
    width,
    x,
    y,
    ...props
  }: {
    height: number;
    isDragging: boolean;
    isInOverlay: boolean;
    item: IItem;
    width: number;
    x: number;
    y: number;
  } & PropsOf<typeof Box>,
  ref,
): React.ReactNode {
  const { gameFiles } = useGameFiles();
  const { gameData } = useGameData();
  const sprite = getItemSprite(item, gameFiles, gameData);

  // TODO: handle item.transform_color

  return (
    <Box
      ref={ref}
      {...props}
      sx={{
        backgroundColor: isInOverlay
          ? 'transparent'
          : 'hsla(230, 80%, 50%, 0.25)',
        boxSizing: 'border-box',
        cursor: isInOverlay ? 'grabbing' : 'grab',
        height: height * CELL_SIZE - 2,
        left: isInOverlay ? undefined : x * CELL_SIZE + 1,
        opacity: isDragging ? 0 : 1,
        pointerEvents: isInOverlay ? 'none' : undefined,
        position: isInOverlay ? undefined : 'absolute',
        top: isInOverlay ? undefined : y * CELL_SIZE + 1,
        width: width * CELL_SIZE - 2,
      }}
    >
      <img
        src={sprite}
        style={{
          height: height * CELL_SIZE - 2,
          left: 0,
          objectFit: 'none',
          position: 'absolute',
          top: 0,
          width: width * CELL_SIZE - 2,
        }}
      />
    </Box>
  );
});

function InventoryGrid({
  isSingleItemGrid = false,
  altPositionID = AltPositionID.NONE,
  children,
  equippedID = EquippedID.NONE,
  height,
  isMerc = false,
  locationID = LocationID.NONE,
  sx,
  width,
  x,
  y,
}: Readonly<
  {
    isSingleItemGrid?: boolean;
    children?: React.ReactNode;
    height: number;
    sx?: React.ComponentProps<typeof Box>['sx'];
    width: number;
    x?: number;
    y?: number;
  } & Partial<Exclude<IItemPosition, 'x' | 'y' | 'width' | 'height'>>
>) {
  const { t } = useTranslation();
  const { selectedFile: file } = useSelectedFileContext();
  const { gameData } = useGameData();
  const stashTabIndex = useStashTabIndex();

  const itemPosition = useMemo(
    () =>
      ({
        altPositionID,
        equippedID,
        file,
        isMerc,
        locationID,
        stashTabIndex,
        // these properties are placeholders for grids
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      }) as IItemPosition,
    [altPositionID, equippedID, file, isMerc, locationID, stashTabIndex],
  );
  const itemPositionID = getUniqueItemPositionID(itemPosition);

  const { clipboard, pasteItem } = useClipboardContext();
  const [pasteMenuState, setPasteMenuState] = useState<{
    mouseX: number;
    mouseY: number;
    cellX: number;
    cellY: number;
  } | null>(null);

  const handleGridContextMenu = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    // subtract 1px for the outer left/top border
    const cellX = Math.floor((e.clientX - rect.left - 1) / CELL_SIZE);
    const cellY = Math.floor((e.clientY - rect.top - 1) / CELL_SIZE);
    if (cellX >= 0 && cellX < width && cellY >= 0 && cellY < height) {
      setPasteMenuState({
        mouseX: e.clientX,
        mouseY: e.clientY,
        cellX,
        cellY,
      });
    }
  };

  const pasteValidation = useMemo(() => {
    if (clipboard == null || pasteMenuState == null || file == null) {
      return null;
    }
    const { item } = clipboard;
    const targetPosition: IItemPosition = {
      ...itemPosition,
      x: pasteMenuState.cellX,
      y: pasteMenuState.cellY,
      width: item.inv_width,
      height: item.inv_height,
      isValid: true,
    };
    const containerItems = getContainerItems(
      file,
      locationID,
      altPositionID,
      equippedID,
      stashTabIndex,
      isMerc,
    );
    return validateItemPlacement(
      item,
      targetPosition,
      width,
      height,
      containerItems,
    );
  }, [
    clipboard,
    pasteMenuState,
    file,
    itemPosition,
    locationID,
    altPositionID,
    equippedID,
    stashTabIndex,
    isMerc,
    width,
    height,
  ]);

  const handlePaste = () => {
    if (clipboard == null || pasteMenuState == null || file == null) return;
    const { item } = clipboard;
    const targetPosition: IItemPosition = {
      ...itemPosition,
      x: pasteMenuState.cellX,
      y: pasteMenuState.cellY,
      width: item.inv_width,
      height: item.inv_height,
      isValid: true,
    };
    pasteItem(targetPosition, width, height);
    setPasteMenuState(null);
  };

  // TODO: XXX can move this to the overlay renderer for perf?
  const { hoveredPosition } = useItemDragContext();
  const isHovered =
    hoveredPosition != null &&
    itemPositionID ===
      getUniqueItemPositionID({
        ...hoveredPosition,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      });

  const { setNodeRef } = useDroppable({
    id: `grid:${itemPositionID}`,
    data: {
      itemPosition,
      width,
      height,
    },
  });

  const isPasteDisabled =
    clipboard == null ||
    !pasteValidation?.isValid ||
    pasteValidation?.conflictingItem != null;
  const pasteTooltip =
    clipboard == null
      ? t('ed2r.item.copyPaste.noItemInClipboard')
      : pasteValidation?.conflictingItem != null
        ? t('ed2r.item.copyPaste.itemCannotFit')
        : pasteValidation?.invalidReason ?? '';
  const pasteLabel =
    clipboard != null
      ? t('ed2r.item.copyPaste.pasteItem', {
          name: getItemName(clipboard.item, gameData),
        })
      : t('ed2r.item.copyPaste.paste');

  return (
    <Box
      ref={setNodeRef}
      onContextMenu={handleGridContextMenu}
      sx={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        width: width * CELL_SIZE + 2,
        height: height * CELL_SIZE + 2,
        borderColor: 'primary',
        borderStyle: 'solid',
        borderWidth: 1,
        boxSizing: 'border-box',
        ...(x != null || y != null ? { position: 'absolute' } : {}),
        ...(x != null ? { left: x * CELL_SIZE } : {}),
        ...(y != null ? { top: y * CELL_SIZE } : {}),
        ...sx,
      }}
    >
      {new Array(height).fill(null).map((_, y) => (
        <Box key={y} sx={{ flex: '0 0 auto', display: 'flex' }}>
          {new Array(width).fill(null).map((_, x) => (
            <Box
              key={x}
              sx={{
                margin: '1px',
                flex: '0 0 auto',
                width: CELL_SIZE - 2,
                height: CELL_SIZE - 2,
                opacity: 0.2,
                borderColor: 'primary',
                borderStyle: 'solid',
                borderWidth: 1,
                boxSizing: 'border-box',
              }}
            />
          ))}
        </Box>
      ))}
      {hoveredPosition != null && isHovered && (
        <>
          {new Array(isSingleItemGrid ? height : hoveredPosition.height)
            .fill(null)
            .map((_, hoverYOffset) => {
              const hoverY =
                (isSingleItemGrid ? 0 : hoveredPosition.y) + hoverYOffset;
              if (hoverY >= height || hoverY < 0) return null;

              return new Array(isSingleItemGrid ? width : hoveredPosition.width)
                .fill(null)
                .map((_, hoverXOffset) => {
                  const hoverX =
                    (isSingleItemGrid ? 0 : hoveredPosition.x) + hoverXOffset;
                  if (hoverX >= width || hoverX < 0) return null;

                  const overlayColor = hoveredPosition.isValid
                    ? 'rgba(0, 100, 255, 0.3)'
                    : 'rgba(255, 0, 0, 0.3)';

                  return (
                    <Box
                      key={`hover-${hoverX}-${hoverY}`}
                      sx={{
                        position: 'absolute',
                        left: hoverX * CELL_SIZE + 1,
                        top: hoverY * CELL_SIZE + 1,
                        width: CELL_SIZE - 2,
                        height: CELL_SIZE - 2,
                        backgroundColor: overlayColor,
                        pointerEvents: 'none',
                        zIndex: 100,
                      }}
                    />
                  );
                });
            })}
        </>
      )}
      {children}
      <Menu
        anchorPosition={
          pasteMenuState != null
            ? { top: pasteMenuState.mouseY, left: pasteMenuState.mouseX }
            : undefined
        }
        anchorReference="anchorPosition"
        onClose={() => setPasteMenuState(null)}
        open={pasteMenuState != null}
      >
        <Tooltip disableHoverListener={!isPasteDisabled} title={pasteTooltip}>
          <span>
            <MenuItem disabled={isPasteDisabled} onClick={handlePaste}>
              {pasteLabel}
            </MenuItem>
          </span>
        </Tooltip>
      </Menu>
    </Box>
  );
}

function CharacterWaypointsTab({
  file,
  onChange,
}: {
  file: CharacterFile;
  onChange: (newValue: CharacterFile) => unknown;
}): React.ReactNode {
  const { t } = useTranslation();
  const onChangeWaypoint = useCallback(
    (
      difficulty: keyof IWaypointData,
      actIndex: number,
      area: string,
      value: boolean,
    ) => {
      const waypoints = file.character.header.waypoints[difficulty];
      const newActs = waypoints.acts.map((act, i) =>
        i === actIndex ? { ...act, [area]: value } : act,
      );
      onChange({
        ...file,
        character: {
          ...file.character,
          header: {
            ...file.character.header,
            waypoints: {
              ...file.character.header.waypoints,
              [difficulty]: { ...waypoints, acts: newActs },
            },
          },
        },
      });
    },
    [file, onChange],
  );

  return (
    <TabPanelBox value="waypoints">
      <Box
        sx={{
          display: 'flex',
          width: '100%',
          height: '100%',
          overflowY: 'auto',
        }}
      >
        <Waypoints
          label={t('ed2r.difficulty.normal')}
          onChange={(actIndex, area, value) =>
            onChangeWaypoint('normal', actIndex, area, value)
          }
          waypoints={file.character.header.waypoints.normal}
        />
        <Waypoints
          label={t('ed2r.difficulty.nightmare')}
          onChange={(actIndex, area, value) =>
            onChangeWaypoint('nm', actIndex, area, value)
          }
          waypoints={file.character.header.waypoints.nm}
        />
        <Waypoints
          label={t('ed2r.difficulty.hell')}
          onChange={(actIndex, area, value) =>
            onChangeWaypoint('hell', actIndex, area, value)
          }
          waypoints={file.character.header.waypoints.hell}
        />
      </Box>
    </TabPanelBox>
  );
}

function Waypoints({
  label,
  waypoints,
  onChange,
}: {
  label: string;
  waypoints: IWaypoints;
  onChange: (actIndex: number, area: string, value: boolean) => unknown;
}): React.ReactNode {
  const { gameData } = useGameData();
  return (
    <Box
      sx={{
        flexGrow: 1,
        flexShrink: 1,
        flexBasis: 0,
        padding: 2,
      }}
    >
      <FormGroup>
        <FormLabel component="legend" sx={{ marginBottom: 2 }}>
          {label}
        </FormLabel>
        {waypoints.acts.map((actWaypoints, actIndex) => {
          const act = gameData.waypointActs[actIndex];
          const actLabel =
            act != null
              ? gameData.strings[act.Name] ?? act.Name
              : String(actIndex + 1);
          return (
            <Fragment key={actIndex}>
              <FormLabel component="legend">{actLabel}</FormLabel>
              {act?.waypoints.map(({ LevelName }) => (
                <Waypoint
                  key={LevelName}
                  label={gameData.strings[LevelName] ?? LevelName}
                  onChange={(newValue) =>
                    onChange(actIndex, LevelName, newValue)
                  }
                  value={actWaypoints[LevelName] ?? false}
                />
              ))}
            </Fragment>
          );
        })}
      </FormGroup>
    </Box>
  );
}

function Waypoint({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (newValue: boolean) => unknown;
}): React.ReactNode {
  return (
    <FormControlLabel
      control={
        <Checkbox
          checked={value}
          onChange={(_event, checked) => onChange(checked)}
        />
      }
      label={label}
    />
  );
}

function CharacterBasicTab({
  file,
  onChange,
}: {
  file: CharacterFile;
  onChange: (newValue: CharacterFile) => unknown;
}): React.ReactNode {
  const { t } = useTranslation();
  const { gameData } = useGameData();

  const header = file.character.header;
  const attributes = file.character.attributes || {};

  const prettyAttributeLabel = (key: string) => {
    const i18nKey = `ed2r.attr.${key}`;
    const translated = t(i18nKey);
    if (translated !== i18nKey) return translated;
    return key
      .replace(/_/g, ' ')
      .replace(/(^| )[a-z]/g, (s) => s.toUpperCase());
  };

  return (
    <TabPanelBox value="basic">
      <Box sx={{ padding: 2, overflowY: 'auto' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            label={t('ed2r.field.name')}
            onChange={(e) =>
              onChange({
                ...file,
                character: {
                  ...file.character,
                  header: { ...header, name: e.target.value },
                },
              })
            }
            size="small"
            value={header.name}
          />
          <TextField
            disabled={true}
            label={t('ed2r.field.class')}
            size="small"
            value={gameData.classes[header.class_id].displayName}
          />
          <Tooltip placement="top" title={t('ed2r.tooltip.realmDowngrade')}>
            <FormControl>
              <InputLabel>{t('ed2r.field.realm')}</InputLabel>
              <Select
                label={t('ed2r.field.realm')}
                onChange={(e) =>
                  onChange({
                    ...file,
                    character: {
                      ...file.character,
                      header: { ...header, realm: Number(e.target.value) },
                    },
                  })
                }
                size="small"
                value={file.character.header.realm}
              >
                <MenuItem value={1}>
                  <Box>{t('ed2r.realm.classic')}</Box>
                </MenuItem>
                <MenuItem value={2}>
                  <Box>{t('ed2r.realm.lod')}</Box>
                </MenuItem>
                <MenuItem value={3}>
                  <Box>{t('ed2r.realm.rotw')}</Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Tooltip>
        </Box>

        <Box
          sx={{ display: 'flex', gap: 2, alignItems: 'center', marginTop: 2 }}
        >
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              label={t('ed2r.field.level')}
              onChange={(e) =>
                onChange({
                  ...file,
                  character: {
                    ...file.character,
                    header: { ...header, level: Number(e.target.value) },
                  },
                })
              }
              size="small"
              type="number"
              value={String(header.level ?? 0)}
            />
            <TextField
              label={t('ed2r.field.experience')}
              onChange={(e) =>
                onChange({
                  ...file,
                  character: {
                    ...file.character,
                    attributes: {
                      ...file.character.attributes,
                      experience: Number(e.target.value),
                    },
                  },
                })
              }
              size="small"
              type="number"
              value={String(attributes.experience ?? 0)}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <FormControlLabel
              control={
                // it's a bit weird that save files have an expansion flag
                // *and* a realm flag, but backwards compatibility I guess...
                <Checkbox
                  checked={Boolean(header.status?.expansion)}
                  onChange={(_e, checked) =>
                    onChange({
                      ...file,
                      character: {
                        ...file.character,
                        header: {
                          ...header,
                          status: {
                            ...(header.status || {}),
                            expansion: checked,
                          },
                        },
                      },
                    })
                  }
                />
              }
              label={t('ed2r.field.expansion')}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={Boolean(header.status?.hardcore)}
                  onChange={(_e, checked) =>
                    onChange({
                      ...file,
                      character: {
                        ...file.character,
                        header: {
                          ...header,
                          status: {
                            ...(header.status || {}),
                            hardcore: checked,
                          },
                        },
                      },
                    })
                  }
                />
              }
              label={t('ed2r.field.hardcore')}
            />
          </Box>
        </Box>

        <Box sx={{ my: 2 }} />

        <Box>
          <FormLabel component="legend">
            {t('ed2r.section.attributes')}
          </FormLabel>
          <Box sx={{ display: 'flex', gap: 1, marginTop: 1 }}>
            <TextField
              label={prettyAttributeLabel('strength')}
              onChange={(e) =>
                onChange({
                  ...file,
                  character: {
                    ...file.character,
                    attributes: {
                      ...file.character.attributes,
                      strength: Number(e.target.value),
                    },
                  },
                })
              }
              size="small"
              value={String(attributes.strength ?? 0)}
            />
            <TextField
              label={prettyAttributeLabel('dexterity')}
              onChange={(e) =>
                onChange({
                  ...file,
                  character: {
                    ...file.character,
                    attributes: {
                      ...file.character.attributes,
                      dexterity: Number(e.target.value),
                    },
                  },
                })
              }
              size="small"
              value={String(attributes.dexterity ?? 0)}
            />
            <TextField
              label={prettyAttributeLabel('vitality')}
              onChange={(e) =>
                onChange({
                  ...file,
                  character: {
                    ...file.character,
                    attributes: {
                      ...file.character.attributes,
                      vitality: Number(e.target.value),
                    },
                  },
                })
              }
              size="small"
              value={String(attributes.vitality ?? 0)}
            />
            <TextField
              label={prettyAttributeLabel('energy')}
              onChange={(e) =>
                onChange({
                  ...file,
                  character: {
                    ...file.character,
                    attributes: {
                      ...file.character.attributes,
                      energy: Number(e.target.value),
                    },
                  },
                })
              }
              size="small"
              value={String(attributes.energy ?? 0)}
            />
            <TextField
              label={prettyAttributeLabel('unused_stats')}
              onChange={(e) =>
                onChange({
                  ...file,
                  character: {
                    ...file.character,
                    attributes: {
                      ...file.character.attributes,
                      unused_stats: Number(e.target.value),
                    },
                  },
                })
              }
              size="small"
              value={String(attributes.unused_stats ?? 0)}
            />
          </Box>
        </Box>

        <Box sx={{ my: 2 }} />

        <Box>
          <FormLabel component="legend">{t('ed2r.section.stats')}</FormLabel>
          <Box sx={{ display: 'flex', gap: 1, marginTop: 1 }}>
            <TextField
              label={prettyAttributeLabel('max_hp')}
              onChange={(e) =>
                onChange({
                  ...file,
                  character: {
                    ...file.character,
                    attributes: {
                      ...file.character.attributes,
                      max_hp: Number(e.target.value),
                    },
                  },
                })
              }
              size="small"
              value={String(attributes.max_hp ?? attributes.max_life ?? 0)}
            />
            <TextField
              label={prettyAttributeLabel('max_mana')}
              onChange={(e) =>
                onChange({
                  ...file,
                  character: {
                    ...file.character,
                    attributes: {
                      ...file.character.attributes,
                      max_mana: Number(e.target.value),
                    },
                  },
                })
              }
              size="small"
              value={String(attributes.max_mana ?? 0)}
            />
            <TextField
              label={prettyAttributeLabel('max_stamina')}
              onChange={(e) =>
                onChange({
                  ...file,
                  character: {
                    ...file.character,
                    attributes: {
                      ...file.character.attributes,
                      max_stamina: Number(e.target.value),
                    },
                  },
                })
              }
              size="small"
              value={String(attributes.max_stamina ?? 0)}
            />
          </Box>
        </Box>

        <Box sx={{ my: 2 }} />

        <Box>
          <FormLabel component="legend">{t('ed2r.section.gold')}</FormLabel>
          <Box sx={{ display: 'flex', gap: 1, marginTop: 1 }}>
            <TextField
              label={prettyAttributeLabel('gold')}
              onChange={(e) =>
                onChange({
                  ...file,
                  character: {
                    ...file.character,
                    attributes: {
                      ...file.character.attributes,
                      gold: Number(e.target.value),
                    },
                  },
                })
              }
              size="small"
              value={String(attributes.gold ?? 0)}
            />
            <TextField
              label={prettyAttributeLabel('stashed_gold')}
              onChange={(e) =>
                onChange({
                  ...file,
                  character: {
                    ...file.character,
                    attributes: {
                      ...file.character.attributes,
                      stashed_gold: Number(e.target.value),
                    },
                  },
                })
              }
              size="small"
              value={String(attributes.stashed_gold ?? 0)}
            />
          </Box>
        </Box>
      </Box>
    </TabPanelBox>
  );
}

function CharacterSkillsTab({
  file,
  onChange,
}: {
  file: CharacterFile;
  onChange: (newValue: CharacterFile) => unknown;
}): React.ReactNode {
  const { t } = useTranslation();
  const { gameData } = useGameData();
  const skills = file.character.skills || [];
  const attributes = file.character.attributes || {};

  const setSkillPoints = (index: number, points: number) => {
    const next = skills.map((s, i) => (i === index ? { ...s, points } : s));
    onChange({ ...file, character: { ...file.character, skills: next } });
  };

  return (
    <TabPanelBox value="skills">
      <Box sx={{ padding: 2, overflowY: 'auto' }}>
        <List>
          <ListItem sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <ListItemText primary={t('ed2r.field.unallocatedSkillPoints')} />
            <TextField
              label={t('ed2r.field.points')}
              onChange={(e) =>
                onChange({
                  ...file,
                  character: {
                    ...file.character,
                    attributes: {
                      ...file.character.attributes,
                      unused_skill_points: Number(e.target.value),
                    },
                  },
                })
              }
              size="small"
              sx={{ width: 100 }}
              type="number"
              value={String(attributes.unused_skill_points ?? 0)}
            />
          </ListItem>
          {skills.map((skill, i) => (
            <ListItem
              key={skill.id}
              sx={{ display: 'flex', gap: 2, alignItems: 'center' }}
            >
              <ListItemText
                primary={gameData.skills[skill.id]?.skillName ?? `#${skill.id}`}
              />
              <TextField
                label={t('ed2r.field.points')}
                onChange={(e) => setSkillPoints(i, Number(e.target.value))}
                size="small"
                sx={{ width: 100 }}
                type="number"
                value={String(skill.points ?? 0)}
              />
            </ListItem>
          ))}
        </List>
      </Box>
    </TabPanelBox>
  );
}

function CharacterMercenaryTab({
  file,
}: {
  file: CharacterFile;
  onChange: (newValue: CharacterFile) => unknown;
}): React.ReactNode {
  const mercItems = file.character.merc_items || [];

  const { draggedItem } = useItemDragContext();
  const draggedItemID = draggedItem ? getUniqueItemID(draggedItem) : null;
  const notDragging = (item: IItem) =>
    draggedItemID == null || getUniqueItemID(item) !== draggedItemID;

  const rightHandItem = mercItems.find(
    (item) =>
      item.location_id === LocationID.EQUIPPED &&
      item.equipped_id === EquippedID.RIGHT_HAND &&
      notDragging(item),
  );
  const handsItem = mercItems.find(
    (item) =>
      item.location_id === LocationID.EQUIPPED &&
      item.equipped_id === EquippedID.HANDS &&
      notDragging(item),
  );
  const headItem = mercItems.find(
    (item) =>
      item.location_id === LocationID.EQUIPPED &&
      item.equipped_id === EquippedID.HEAD &&
      notDragging(item),
  );
  const torsoItem = mercItems.find(
    (item) =>
      item.location_id === LocationID.EQUIPPED &&
      item.equipped_id === EquippedID.TORSO &&
      notDragging(item),
  );
  const leftHandItem = mercItems.find(
    (item) =>
      item.location_id === LocationID.EQUIPPED &&
      item.equipped_id === EquippedID.LEFT_HAND &&
      notDragging(item),
  );
  const feetItem = mercItems.find(
    (item) =>
      item.location_id === LocationID.EQUIPPED &&
      item.equipped_id === EquippedID.FEET &&
      notDragging(item),
  );

  return (
    <TabPanelBox sx={{ overflow: 'auto' }} value="mercenary">
      <InventoryGrid
        equippedID={EquippedID.RIGHT_HAND}
        file={file}
        height={4}
        isMerc={true}
        isSingleItemGrid={true}
        locationID={LocationID.EQUIPPED}
        width={2}
        x={0}
        y={0.25}
      >
        <InventoryGridItem
          height={4}
          item={rightHandItem}
          width={2}
          x={0}
          y={0}
        />
      </InventoryGrid>

      <InventoryGrid
        equippedID={EquippedID.HANDS}
        file={file}
        height={2}
        isMerc={true}
        isSingleItemGrid={true}
        locationID={LocationID.EQUIPPED}
        width={2}
        x={0}
        y={4.5}
      >
        <InventoryGridItem height={2} item={handsItem} width={2} x={0} y={0} />
      </InventoryGrid>

      <InventoryGrid
        equippedID={EquippedID.RIGHT_FINGER}
        file={file}
        height={1}
        isMerc={true}
        isSingleItemGrid={true}
        locationID={LocationID.EQUIPPED}
        width={1}
        x={2.25}
        y={5.5}
      >
        {/* mercs rarely have rings but keep slot */}
      </InventoryGrid>

      <InventoryGrid
        equippedID={EquippedID.HEAD}
        file={file}
        height={2}
        isMerc={true}
        isSingleItemGrid={true}
        locationID={LocationID.EQUIPPED}
        width={2}
        x={3.5}
        y={0}
      >
        <InventoryGridItem height={2} item={headItem} width={2} x={0} y={0} />
      </InventoryGrid>

      <InventoryGrid
        equippedID={EquippedID.TORSO}
        file={file}
        height={3}
        isMerc={true}
        isSingleItemGrid={true}
        locationID={LocationID.EQUIPPED}
        width={2}
        x={3.5}
        y={2.25}
      >
        <InventoryGridItem height={3} item={torsoItem} width={2} x={0} y={0} />
      </InventoryGrid>

      <InventoryGrid
        equippedID={EquippedID.WAIST}
        file={file}
        height={1}
        isMerc={true}
        isSingleItemGrid={true}
        locationID={LocationID.EQUIPPED}
        width={2}
        x={3.5}
        y={5.5}
      />

      <InventoryGrid
        equippedID={EquippedID.NECK}
        file={file}
        height={1}
        isMerc={true}
        isSingleItemGrid={true}
        locationID={LocationID.EQUIPPED}
        width={1}
        x={5.75}
        y={2.25}
      >
        {/* mercary amulets */}
      </InventoryGrid>

      <InventoryGrid
        equippedID={EquippedID.LEFT_FINGER}
        file={file}
        height={1}
        isMerc={true}
        isSingleItemGrid={true}
        locationID={LocationID.EQUIPPED}
        width={1}
        x={5.75}
        y={5.5}
      />

      <InventoryGrid
        equippedID={EquippedID.LEFT_HAND}
        file={file}
        height={4}
        isMerc={true}
        isSingleItemGrid={true}
        locationID={LocationID.EQUIPPED}
        width={2}
        x={7}
        y={0.25}
      >
        <InventoryGridItem
          height={4}
          item={leftHandItem}
          width={2}
          x={0}
          y={0}
        />
      </InventoryGrid>

      <InventoryGrid
        equippedID={EquippedID.FEET}
        file={file}
        height={2}
        isMerc={true}
        isSingleItemGrid={true}
        locationID={LocationID.EQUIPPED}
        width={2}
        x={7}
        y={4.5}
      >
        <InventoryGridItem height={2} item={feetItem} width={2} x={0} y={0} />
      </InventoryGrid>
    </TabPanelBox>
  );
}
