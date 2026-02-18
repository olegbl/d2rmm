import type { IInstallModsOptions } from 'bridge/BridgeAPI';
import type {
  IItem,
  IStashPage,
  IWaypointData,
  IWaypoints,
} from 'bridge/third-party/d2s/d2/types';
import BridgeAPI from 'renderer/BridgeAPI';
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
import {
  AltPositionID,
  CELL_SIZE,
  COLOR_MAP,
  EquippedID,
  LocationID,
  Quality,
} from 'renderer/react/ed2r/ED2RConstants';
import {
  GameFiles,
  useGameFiles,
} from 'renderer/react/ed2r/ED2RGameFilesContext';
import {
  IItemPosition,
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
import resolvePath from 'renderer/utils/resolvePath';
import { DragOverlay, useDroppable, useDraggable } from '@dnd-kit/core';
import { PropsOf } from '@emotion/react';
import { Fragment, forwardRef, useCallback, useMemo } from 'react';
import {
  Circle,
  Close,
  FileCopyOutlined,
  Refresh,
  RefreshOutlined,
  Save,
  SaveOutlined,
} from '@mui/icons-material';
import { TabContext, TabList, TabPanel } from '@mui/lab';
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
  } = useSaveFiles();
  const { selectedFile, selectedFileName, setSelectedFileName } =
    useSelectedFileContext();

  const fileList = Object.keys(saveFiles)
    .map((fileName) => saveFiles[fileName])
    .sort(
      (a, b) =>
        SORT_ORDER.indexOf(a.type) - SORT_ORDER.indexOf(b.type) ||
        a.fileName.localeCompare(b.fileName),
    );

  const onLoad = useCallback(async () => {
    const { characters, stashes, gameFiles } =
      await BridgeAPI.readD2SData(runtimeModOptions);

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
                  <Tooltip title="Reload all save file data.">
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
                    <Tooltip title="This file has been modified but has not been saved yet.">
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
                      file.type === 'character'
                        ? file.character.header.name
                        : file.type === 'stash'
                          ? file.fileName.includes('HardCore')
                            ? 'Stash (Hardcore)'
                            : 'Stash (Softcore)'
                          : 'Unknown'
                    }
                    secondary={file.fileName}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
        <Divider orientation="vertical" />
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
            <Button onClick={onLoad}>Load save data</Button>
          ) : selectedFile == null ? (
            <Typography variant="body2">No file selected.</Typography>
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
  const runtimeModOptions = useRuntimeOptions();

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
            {tabIndices.map((index) => (
              <Tab
                key={index}
                label={
                  <span>
                    Page {index + 1}
                    {file.stash.pageCount > 3 && (
                      <Tooltip title="Delete this stash tab">
                        <IconButton
                          onClick={() => handleDeleteTab(index)}
                          size="small"
                          sx={{ ml: 1 }}
                        >
                          <Close fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </span>
                }
                value={String(index)}
              />
            ))}
            <Tab label="Raw" value="raw" />
          </TabList>
        </Box>
        <Divider />
        {tabIndices.map((index) => (
          <StashTab key={index} file={file} index={index} onChange={onChange} />
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
            File{' '}
            <Link
              href="#"
              onClick={() => {
                ShellAPI.showItemInFolder(
                  resolvePath(savesPath, file.fileName),
                ).catch(console.error);
              }}
            >
              {file.fileName}
            </Link>{' '}
            loaded at {new Date(file.readTime).toLocaleTimeString()}
          </Typography>
          <Box sx={{ flex: '1 1 0' }} />
          <ButtonGroup sx={{ flex: '0 0 auto' }} variant="outlined">
            {file.edited ? (
              <Button
                onClick={() => {
                  // TODO: add confirmation modal
                  onRevert();
                }}
                startIcon={<Refresh />}
              >
                Revert
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
              Save
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
}: {
  file: StashFile;
  index: number;
  onChange: (newValue: StashFile) => unknown;
}): React.ReactNode {
  const { gameFiles } = useGameFiles();

  const page = file.stash.pages[index];

  if (page == null) {
    // this should never happen
    return (
      <TabPanelBox value={String(index)}>Stash page not found.</TabPanelBox>
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

  // TODO: do non-expansion stashes have a different file name?
  const isExpansion = true;
  const inventory = gameFiles['global/excel/inventory.txt'] as TSVData;
  const inventoryRow = inventory.rows.find(
    (row) => row.class === (isExpansion ? 'Bank Page 1' : 'Big Bank Page 1'),
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
      <AdvancedStashSection title="Gems">
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
      </AdvancedStashSection>

      <AdvancedStashSection title="Runes">
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
      </AdvancedStashSection>

      <AdvancedStashSection title="Materials">
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
          {MATERIALS_CODES.map((code) => (
            <AdvancedStashSlot
              key={code}
              file={file}
              item={itemsByType.get(code)}
              itemCode={code}
            />
          ))}
        </Box>
      </AdvancedStashSection>

      {allOtherCodes.length > 0 && (
        <AdvancedStashSection title="Other">
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
            {allOtherCodes.map((code) => (
              <AdvancedStashSlot
                key={code}
                file={file}
                item={itemsByType.get(code)}
                itemCode={code}
              />
            ))}
          </Box>
        </AdvancedStashSection>
      )}
    </Box>
  );
}

function AdvancedStashSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}): React.ReactNode {
  return (
    <Box>
      <Typography
        sx={{ mb: 0.5, fontWeight: 'bold', opacity: 0.7 }}
        variant="caption"
      >
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function AdvancedStashSlot({
  file,
  item,
  itemCode,
}: {
  file: StashFile;
  item?: IItem | null;
  itemCode: string;
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
      height: 1,
      isAdvancedStash: true,
      isValid: true,
      locationID: LocationID.NONE,
      isMerc: false,
      stashTabIndex,
      width: 1,
      x: 0,
      y: 0,
    }),
    [itemCode, file, selectedFile, stashTabIndex],
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
        width: 0,
        height: 0,
      });

  const { setNodeRef } = useDroppable({
    id: `advslot:${itemCode}:${itemPositionID}`,
    data: {
      itemPosition,
      width: 1,
      height: 1,
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

  return (
    <Box
      ref={(node: HTMLElement | null) => {
        setNodeRef(node);
        setDragRef(node);
      }}
      {...attributes}
      {...listeners}
      sx={{
        position: 'relative',
        width: CELL_SIZE,
        height: CELL_SIZE,
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
              width: CELL_SIZE - 2,
              height: CELL_SIZE - 2,
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
            <Tab label="Basic" value="basic" />
            <Tab label="Skills" value="skills" />
            <Tab label="Equipment" value="equipment" />
            <Tab label="Inventory" value="inventory" />
            <Tab label="Stash" value="stash" />
            <Tab label="Cube" value="cube" />
            <Tab label="Mercenary" value="mercenary" />
            <Tab label="Waypoints" value="waypoints" />
            <Tab label="Raw" value="raw" />
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
            File{' '}
            <Link
              href="#"
              onClick={() => {
                ShellAPI.showItemInFolder(
                  resolvePath(savesPath, file.fileName),
                ).catch(console.error);
              }}
            >
              {file.fileName}
            </Link>{' '}
            loaded at {new Date(file.readTime).toLocaleTimeString()}
          </Typography>
          <Box sx={{ flex: '1 1 0' }} />
          <ButtonGroup sx={{ flex: '0 0 auto' }} variant="outlined">
            {file.edited ? (
              <Button
                onClick={() => {
                  // TODO: add confirmation modal
                  onRevert();
                }}
                startIcon={<Refresh />}
              >
                Revert
              </Button>
            ) : null}
            <Button
              onClick={() => {
                // TODO: add confirmation modal
              }}
              startIcon={<FileCopyOutlined />}
            >
              Backup
            </Button>
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
              Save
            </Button>
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
  const isExpansion = file.character.header.status.expansion;
  const inventory = gameFiles['global/excel/inventory.txt'] as TSVData;
  const inventoryRow = inventory.rows.find(
    (row) =>
      row.class ===
      (isExpansion
        ? `${file.character.header.class}2`
        : file.character.header.class),
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
    (row) => row.class === (isExpansion ? 'Bank Page 1' : 'Big Bank Page 1'),
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

function ItemName({ item }: { item: IItem }): React.ReactNode {
  const name = getItemName(item);
  const color = useItemColor(item);

  const lines = name
    // remove localization feminine/masculine indicators
    .replace(/(\[fs\]|\[ms\])/gm, '')
    // split into lines
    .split('\n')
    // split into tokens
    .map((line, lineIndex) =>
      (line.match(/(^|(?:ÿc.))(.+?)(?:(?=ÿc.)|$)/gm) ?? [])
        // separate color from text
        .map((token, tokenIndex) =>
          token.startsWith('ÿc')
            ? [COLOR_MAP[token.substring(0, 3)], token.substring(3)]
            : [lineIndex === 0 && tokenIndex === 0 ? color : undefined, token],
        ),
    );

  return lines.map((line, lineIndex) => (
    <span key={lineIndex} style={{ display: 'inline-block' }}>
      {line.map(([color, token], tokenIndex) => (
        <span key={tokenIndex} style={{ color }}>
          {token}
        </span>
      ))}
    </span>
  ));
}

function getItemName(item: IItem): string {
  if (item.personalized) {
    return `${item.personalized_name}'s ${getItemName({ ...item, personalized: 0 })}`;
  }

  // TODO: item.runeword_id ("Runeword" + id*) runes.txt (Name -> Key) item-runes.json
  //       * id > 75 -> +25
  //         id <= 75 -> +25
  //         etc...?
  //         2718 -> 48 (delirium)
  //         2786 -> 173 (mosaic)
  if (item.runeword_name != null) {
    // TODO: add recipe line
    return `${item.runeword_name}\n${item.type_name}`;
  }

  switch (item.quality) {
    case Quality.LOW:
      return `Low Quality ${item.type_name}`;
    case Quality.NORMAL:
      return item.type_name;
    case Quality.SUPERIOR:
      return `Superior ${item.type_name}`;
    case Quality.MAGIC:
      return [item.magic_prefix_name, item.type_name, item.magic_suffix_name]
        .filter((value) => value != null)
        .join(' ');
    case Quality.CRAFTED:
    case Quality.RARE:
      return [item.rare_name, item.rare_name2]
        .filter((value) => value != null)
        .join(' ')
        .concat(`\n${item.type_name}`);
    case Quality.SET:
      return `${item.set_name}\n${item.type_name}`;
    case Quality.UNIQUE:
      return `${item.unique_name}\n${item.type_name}`;
  }

  return item.type_name;
}

type ColorVar = { r: number; g: number; b: number; a: number };
type ColorConst = [number, number, number, number];

function useItemColor(item: IItem): string {
  const { gameFiles } = useGameFiles();

  const profileHD = gameFiles['global/ui/layouts/_profilehd.json'] as {
    [name: `FontColor${string}`]: string | ColorVar;
    TooltipStyle: {
      DefaultColor: string | ColorConst;
      QuestColor: string | ColorConst;
      RareColor: string | ColorConst;
      CraftedColor: string | ColorConst;
      TemperedColor: string | ColorConst;
      MagicColor: string | ColorConst;
      SetColor: string | ColorConst;
      UniqueColor: string | ColorConst;
      SocketedColor: string | ColorConst;
      EtherealColor: string | ColorConst;
      HealthPotionColor: string | ColorConst;
      ManaPotionColor: string | ColorConst;
      RejuvPotionColor: string | ColorConst;
      GoldColor: string | ColorConst;
      RuneColor: string | ColorConst;
      EventItemsColor: string | ColorConst;
    };
  };

  function getColor(color: string | ColorConst): string {
    if (Array.isArray(color)) {
      const [r1, g1, b1, a] = color;
      const r = Math.round(r1 * 255);
      const g = Math.round(g1 * 255);
      const b = Math.round(b1 * 255);
      return `rgba(${r},${g},${b},${a})`;
    }

    let colorVar: string | ColorConst | ColorVar = color;
    while (typeof colorVar === 'string' && colorVar.startsWith('$FontColor')) {
      colorVar = profileHD[`FontColor${colorVar.slice('$FontColor'.length)}`];
    }

    if (typeof colorVar === 'object') {
      const { r, g, b, a } = colorVar;
      const a1 = a / 255;
      return `rgba(${r},${g},${b},${a1})`;
    }

    return colorVar;
  }

  if (item.runeword_name != null) {
    return getColor(profileHD.TooltipStyle.UniqueColor);
  }

  if (item.categories.includes('Rune')) {
    return getColor(profileHD.TooltipStyle.RuneColor);
  }

  if (item.categories.includes('Rejuv Potion')) {
    return getColor(profileHD.TooltipStyle.RejuvPotionColor);
  }

  if (item.categories.includes('Healing Potion')) {
    return getColor(profileHD.TooltipStyle.HealthPotionColor);
  }

  if (item.categories.includes('Mana Potion')) {
    return getColor(profileHD.TooltipStyle.ManaPotionColor);
  }

  if (item.categories.includes('Quest')) {
    return getColor(profileHD.TooltipStyle.QuestColor);
  }

  if (item.categories.includes('Event')) {
    return getColor(profileHD.TooltipStyle.EventItemsColor);
  }

  switch (item.quality) {
    case Quality.LOW:
    case Quality.NORMAL:
    case Quality.SUPERIOR:
      if (item.ethereal) {
        return getColor(profileHD.TooltipStyle.EtherealColor);
      }
      if (item.socketed) {
        return getColor(profileHD.TooltipStyle.SocketedColor);
      }
      return getColor(profileHD.TooltipStyle.DefaultColor);
    case Quality.MAGIC:
      return getColor(profileHD.TooltipStyle.MagicColor);
    case Quality.CRAFTED:
      return getColor(profileHD.TooltipStyle.CraftedColor);
    case Quality.RARE:
      return getColor(profileHD.TooltipStyle.RareColor);
    case Quality.SET:
      return getColor(profileHD.TooltipStyle.SetColor);
    case Quality.UNIQUE:
      return getColor(profileHD.TooltipStyle.UniqueColor);
  }

  return '#FFFFFF';
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

function getItemSprite(item: IItem, gameFiles: GameFiles): string {
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
      `Could not find sprite for item "${getItemName(item)}" (${assetFilePaths[0]}).`,
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

  if (item == null) {
    return null;
  }

  x ??= item.position_x;
  y ??= item.position_y;
  width ??= item.inv_width;
  height ??= item.inv_height;

  return (
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
            {
              /* temporary hack to show some of the stats */
              Array.from(
                new Set(
                  (item.displayed_combined_magic_attributes ?? [])
                    .map((attr) => attr.description)
                    .filter(Boolean),
                ),
              ).map((str) => (
                <span key={str} style={{ display: 'inline-block' }}>
                  {str}
                </span>
              ))
            }
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
        width={width}
        x={x}
        y={y}
      />
    </InventoryGridItemTooltip>
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
  const sprite = getItemSprite(item, gameFiles);

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
  const { selectedFile: file } = useSelectedFileContext();
  const stashTabIndex = useStashTabIndex();

  const itemPosition = {
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
  } as IItemPosition;
  const itemPositionID = getUniqueItemPositionID(itemPosition);

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

  return (
    <Box
      ref={setNodeRef}
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
  const onChangeWaypoint = useCallback(
    <
      TDifficulty extends keyof IWaypointData,
      TAct extends keyof IWaypoints,
      TArea extends keyof IWaypoints[TAct],
    >(
      difficulty: TDifficulty,
      act: TAct,
      area: TArea,
      value: boolean,
    ) => {
      onChange({
        ...file,
        character: {
          ...file.character,
          header: {
            ...file.character.header,
            waypoints: {
              ...file.character.header.waypoints,
              [difficulty]: {
                ...file.character.header.waypoints[difficulty],
                [act]: {
                  ...file.character.header.waypoints[difficulty][act],
                  [area]: value,
                },
              },
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
          label="Normal"
          onChange={(act, area, value) =>
            onChangeWaypoint('normal', act, area, value)
          }
          waypoints={file.character.header.waypoints.normal}
        />
        <Waypoints
          label="Nightmare"
          onChange={(act, area, value) =>
            onChangeWaypoint('nm', act, area, value)
          }
          waypoints={file.character.header.waypoints.nm}
        />
        <Waypoints
          label="Hell"
          onChange={(act, area, value) =>
            onChangeWaypoint('hell', act, area, value)
          }
          waypoints={file.character.header.waypoints.hell}
        />
      </Box>
    </TabPanelBox>
  );
}

function getWaypointActLabel<TAct extends keyof IWaypoints>(act: TAct): string {
  // TODO: get localized string from game files
  return String(act)
    .replace(/_/g, ' ')
    .replace(/(^| )[a-z]/g, (value) => value.toUpperCase());
}

function getWaypointAreaLabel<
  TAct extends keyof IWaypoints,
  TArea extends keyof IWaypoints[TAct],
>(_act: TAct, area: TArea): string {
  // TODO: get localized string from game files
  return String(area)
    .replace(/_/g, ' ')
    .replace(/lvl/g, 'level')
    .replace(/(^| )[a-z]/g, (value) => value.toUpperCase())
    .replace(/Of/g, 'of')
    .replace(/The/g, 'the');
}

function Waypoints({
  label,
  waypoints,
  onChange,
}: {
  label: string;
  waypoints: IWaypoints;
  onChange: <
    TAct extends keyof IWaypoints,
    TArea extends keyof IWaypoints[TAct],
  >(
    act: TAct,
    area: TArea,
    value: boolean,
  ) => unknown;
}): React.ReactNode {
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
        {Object.keys(waypoints).map((actKey) => {
          const act = actKey as keyof IWaypoints;
          return (
            <Fragment key={act}>
              <FormLabel component="legend">
                {getWaypointActLabel(act)}
              </FormLabel>
              {Object.keys(waypoints[act]).map((areaKey) => {
                const area = areaKey as keyof IWaypoints[keyof IWaypoints];
                return (
                  <Waypoint
                    key={area}
                    label={getWaypointAreaLabel(act, area)}
                    onChange={(newValue) => onChange(act, area, newValue)}
                    value={waypoints[act][area]}
                  />
                );
              })}
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
  const header = file.character.header;
  const attributes = file.character.attributes || {};

  const prettyAttributeLabel = (key: string) => {
    const MAP: { [k: string]: string } = {
      strength: 'Strength',
      dexterity: 'Dexterity',
      vitality: 'Vitality',
      energy: 'Energy',
      max_stamina: 'Max Stamina',
      max_hp: 'Max Life',
      max_mana: 'Max Mana',
      unused_stats: 'Unallocated Stat Points',
      unused_skill_points: 'Unallocated Skill Points',
      experience: 'Experience',
      gold: 'Gold',
      stashed_gold: 'Stashed Gold',
    };
    if (MAP[key]) return MAP[key];
    return key
      .replace(/_/g, ' ')
      .replace(/(^| )[a-z]/g, (s) => s.toUpperCase());
  };

  return (
    <TabPanelBox value="basic">
      <Box sx={{ padding: 2, overflowY: 'auto' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            label="Name"
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
            label="Class"
            size="small"
            value={header.class}
          />
        </Box>

        <Box
          sx={{ display: 'flex', gap: 2, alignItems: 'center', marginTop: 2 }}
        >
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              label="Level"
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
              label="Experience"
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
              label="Expansion"
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
              label="Hardcore"
            />
          </Box>
        </Box>

        <Box sx={{ my: 2 }} />

        <Box>
          <FormLabel component="legend">Attributes</FormLabel>
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
          <FormLabel component="legend">Stats</FormLabel>
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
          <FormLabel component="legend">Gold</FormLabel>
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
            <ListItemText primary="Unallocated Skill Points" />
            <TextField
              label="Points"
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
              <ListItemText primary={skill.name ?? `#${skill.id}`} />
              <TextField
                label="Points"
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
