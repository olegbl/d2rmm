import type { TSVData } from 'bridge/TSV';
import type { IItem } from 'bridge/third-party/d2s/d2/types';
import useSessionState from 'renderer/react/context/SessionContext';
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
import { useGameFiles } from 'renderer/react/ed2r/ED2RGameFilesContext';
import {
  STAGING_SENTINEL_FILE,
  getContainerItems,
  useItemDragContext,
  validateItemPlacement,
} from 'renderer/react/ed2r/ED2RItemDragContext';
import { getUniqueItemID } from 'renderer/react/ed2r/ED2RItemPosition';
import { ItemTooltip } from 'renderer/react/ed2r/ED2RItemTooltip';
import { getItemSprite } from 'renderer/react/ed2r/ED2RSaveFileUtils';
import {
  CharacterFile,
  SaveFile,
  StashFile,
  useSaveFiles,
} from 'renderer/react/ed2r/ED2RSaveFilesContext';
import { useSelectedFileContext } from 'renderer/react/ed2r/ED2RSelectedFileContext';
import { ItemDescription } from 'renderer/react/ed2r/components/ItemDescription';
import { ItemName } from 'renderer/react/ed2r/components/ItemName';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

// ---------------------------------------------------------------------------
// Grid dimension helpers (mirrors logic in CharacterInventoryTab / StashTab)
// ---------------------------------------------------------------------------

type GridSpec = {
  altPositionID: AltPositionID;
  locationID: LocationID;
  stashTabIndex: number;
  isMerc: boolean;
  width: number;
  height: number;
};

function getInventoryGridSpec(
  file: CharacterFile,
  gameFiles: ReturnType<typeof useGameFiles>['gameFiles'],
  gameData: GameData,
): GridSpec {
  const inventory = gameFiles['global/excel/inventory.txt'] as TSVData;
  const isExpansion = file.character.header.status.expansion;
  const characterClass =
    gameData.classes[file.character.header.class_id]?.name ?? '';
  const inventoryRow = inventory?.rows.find(
    (row) =>
      row.class === (isExpansion ? `${characterClass}2` : characterClass),
  );
  return {
    altPositionID: AltPositionID.INVENTORY,
    locationID: LocationID.NONE,
    stashTabIndex: -1,
    isMerc: false,
    width: +(inventoryRow?.gridX ?? 10),
    height: +(inventoryRow?.gridY ?? 4),
  };
}

function getCubeGridSpec(
  file: CharacterFile,
  gameFiles: ReturnType<typeof useGameFiles>['gameFiles'],
): GridSpec {
  const inventory = gameFiles['global/excel/inventory.txt'] as TSVData;
  const isExpansion = file.character.header.status.expansion;
  const inventoryRow = inventory?.rows.find(
    (row) =>
      row.class ===
      (isExpansion ? 'Transmogrify Box Page 1' : 'Transmogrify Box2'),
  );
  return {
    altPositionID: AltPositionID.CUBE,
    locationID: LocationID.NONE,
    stashTabIndex: -1,
    isMerc: false,
    width: +(inventoryRow?.gridX ?? 3),
    height: +(inventoryRow?.gridY ?? 4),
  };
}

function getCharacterStashGridSpec(
  file: CharacterFile,
  gameFiles: ReturnType<typeof useGameFiles>['gameFiles'],
): GridSpec {
  const inventory = gameFiles['global/excel/inventory.txt'] as TSVData;
  const isExpansion = file.character.header.status.expansion;
  const inventoryRow = inventory?.rows.find(
    (row) => row.class === (isExpansion ? 'Big Bank Page 1' : 'Bank Page 1'),
  );
  return {
    altPositionID: AltPositionID.STASH,
    locationID: LocationID.NONE,
    stashTabIndex: -1,
    isMerc: false,
    width: +(inventoryRow?.gridX ?? (isExpansion ? 10 : 6)),
    height: +(inventoryRow?.gridY ?? (isExpansion ? 10 : 4)),
  };
}

function getStashPageGridSpec(
  _file: StashFile,
  tabIndex: number,
  gameFiles: ReturnType<typeof useGameFiles>['gameFiles'],
): GridSpec {
  const inventory = gameFiles['global/excel/inventory.txt'] as TSVData;
  const inventoryRow = inventory?.rows.find(
    (row) => row.class === 'Big Bank Page 1',
  );
  return {
    altPositionID: AltPositionID.STASH,
    locationID: LocationID.NONE,
    stashTabIndex: tabIndex,
    isMerc: false,
    width: +(inventoryRow?.gridX ?? 10),
    height: +(inventoryRow?.gridY ?? 10),
  };
}

/**
 * Returns an ordered list of GridSpecs to try when placing a staged item,
 * based on which file is selected and which tab is currently active.
 * Returns [] when the current tab has no placeable item grid.
 */
function getTargetGridSpecs(
  file: SaveFile,
  currentTab: string,
  gameFiles: ReturnType<typeof useGameFiles>['gameFiles'],
  gameData: GameData,
): GridSpec[] {
  if (file.type === 'character') {
    switch (currentTab) {
      case 'inventory':
        return [
          getInventoryGridSpec(file, gameFiles, gameData),
          getCubeGridSpec(file, gameFiles),
        ];
      case 'cube':
        return [
          getCubeGridSpec(file, gameFiles),
          getInventoryGridSpec(file, gameFiles, gameData),
        ];
      case 'stash':
        return [getCharacterStashGridSpec(file, gameFiles)];
      default:
        // basic, skills, waypoints, equipment, mercenary, raw — no item grid visible
        return [];
    }
  } else if (file.type === 'stash') {
    const tabIndex = parseInt(currentTab, 10);
    if (isNaN(tabIndex) || tabIndex < 0) return [];
    const page = file.stash.pages[tabIndex];
    // Advanced stash pages don't have a regular grid
    if (page == null || page.sectionType !== 0) return [];
    return [getStashPageGridSpec(file, tabIndex, gameFiles)];
  }
  return [];
}

/**
 * Finds the first (x, y) position in `spec` where `item` fits without
 * overlapping any existing item. Scans top-to-bottom, left-to-right.
 */
function findFirstValidPosition(
  item: IItem,
  file: SaveFile,
  spec: GridSpec,
): { x: number; y: number } | null {
  const containerItems = getContainerItems(
    file,
    spec.locationID,
    spec.altPositionID,
    EquippedID.NONE,
    spec.stashTabIndex,
    spec.isMerc,
  );

  const basePosition = {
    altPositionID: spec.altPositionID,
    equippedID: EquippedID.NONE,
    file,
    height: item.inv_height,
    isValid: true,
    locationID: spec.locationID,
    isMerc: spec.isMerc,
    stashTabIndex: spec.stashTabIndex,
    width: item.inv_width,
    x: 0,
    y: 0,
  };

  for (let y = 0; y <= spec.height - item.inv_height; y++) {
    for (let x = 0; x <= spec.width - item.inv_width; x++) {
      const { isValid, conflictingItem } = validateItemPlacement(
        item,
        { ...basePosition, x, y },
        spec.width,
        spec.height,
        containerItems,
      );
      if (isValid && conflictingItem == null) {
        return { x, y };
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Tab visibility helper
// ---------------------------------------------------------------------------

/**
 * Returns true when the current tab shows a placeable item grid and the
 * staging panel should be visible.
 */
function isStagingVisibleForTab(
  file: SaveFile | null,
  currentTab: string,
): boolean {
  if (file == null) return false;
  if (file.type === 'character') {
    return ['equipment', 'inventory', 'stash', 'cube', 'mercenary'].includes(
      currentTab,
    );
  }
  // stash: show on every tab except raw
  return currentTab !== 'raw';
}

// ---------------------------------------------------------------------------
// StagingItemTile — a single draggable item tile in the staging area
// ---------------------------------------------------------------------------

function StagingItemTile({ item }: { item: IItem }): React.ReactNode {
  const { t } = useTranslation();
  const { gameFiles } = useGameFiles();
  const { gameData } = useGameData();
  const {
    pushHistory,
    onChangeSilent,
    stagingItems,
    setStagingItemsSilent,
    saveFiles,
  } = useSaveFiles();
  const { selectedFile } = useSelectedFileContext();
  const { gameFiles: gf } = useGameFiles();

  // Read the current tab from session state (same key used by Character/Stash).
  const [currentTab] = useSessionState<string>(
    `ED2R-selected-tab:${selectedFile?.fileName ?? ''}`,
    'basic',
  );

  const [contextMenuPos, setContextMenuPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // "No valid location" tooltip state
  const [showNoLocation, setShowNoLocation] = useState(false);

  const itemPositionID = getUniqueItemID(item);

  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `staging:${itemPositionID}`,
    data: {
      item,
      fromStaging: true,
      itemPosition: {
        altPositionID: item.alt_position_id,
        equippedID: item.equipped_id,
        file: STAGING_SENTINEL_FILE,
        height: item.inv_height,
        isValid: true,
        locationID: item.location_id,
        isMerc: false,
        stashTabIndex: -1,
        width: item.inv_width,
        x: item.position_x,
        y: item.position_y,
      },
    },
  });

  const sprite = getItemSprite(item, gameFiles, gameData);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  const handleDelete = () => {
    pushHistory({ staging: stagingItems });
    setStagingItemsSilent(
      stagingItems.filter((i) => getUniqueItemID(i) !== getUniqueItemID(item)),
    );
    setContextMenuPos(null);
  };

  const handleCtrlClick = (e: React.PointerEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    e.stopPropagation();

    if (selectedFile == null) {
      setShowNoLocation(true);
      setTimeout(() => setShowNoLocation(false), 2000);
      return;
    }

    // Re-read the file from saveFiles to get the latest state.
    const file = saveFiles[selectedFile.fileName] ?? selectedFile;
    const specs = getTargetGridSpecs(file, currentTab, gf, gameData);

    for (const spec of specs) {
      const pos = findFirstValidPosition(item, file, spec);
      if (pos != null) {
        // Build the new file state with the item placed.
        const placedItem: IItem = {
          ...item,
          alt_position_id: spec.altPositionID,
          equipped_id: EquippedID.NONE,
          location_id: spec.locationID,
          position_x: pos.x,
          position_y: pos.y,
        };

        let newFile = file;
        if (file.type === 'character') {
          newFile = {
            ...file,
            character: {
              ...file.character,
              items: file.character.items.concat([placedItem]),
            },
            edited: true,
          };
        } else if (file.type === 'stash') {
          newFile = {
            ...file,
            stash: {
              ...file.stash,
              pages: file.stash.pages.map((page, index) =>
                index === spec.stashTabIndex
                  ? { ...page, items: page.items.concat([placedItem]) }
                  : page,
              ),
            },
            edited: true,
          };
        }

        // Atomic: add to file + remove from staging in one undo step.
        pushHistory({
          files: { [file.fileName]: file },
          staging: stagingItems,
        });
        onChangeSilent(newFile);
        setStagingItemsSilent(
          stagingItems.filter(
            (i) => getUniqueItemID(i) !== getUniqueItemID(item),
          ),
        );
        return;
      }
    }

    // No valid position found.
    setShowNoLocation(true);
    setTimeout(() => setShowNoLocation(false), 2000);
  };

  return (
    <>
      <ItemTooltip
        arrow={true}
        placement="bottom"
        title={
          showNoLocation ? (
            t('ed2r.staging.noValidLocation')
          ) : (
            <Box sx={{ padding: 1 }}>
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
          )
        }
      >
        <Box
          ref={setNodeRef}
          {...attributes}
          {...listeners}
          onContextMenu={handleContextMenu}
          onPointerDown={(e) => {
            if (e.ctrlKey || e.metaKey) {
              handleCtrlClick(e);
              return;
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (listeners as any)?.onPointerDown?.(e);
          }}
          sx={{
            backgroundColor: 'hsla(230, 80%, 50%, 0.25)',
            boxSizing: 'border-box',
            cursor: 'grab',
            flexShrink: 0,
            height: item.inv_height * CELL_SIZE - 2,
            margin: '1px',
            position: 'relative',
            width: item.inv_width * CELL_SIZE - 2,
          }}
        >
          {sprite !== '' && (
            <img
              src={sprite}
              style={{
                height: item.inv_height * CELL_SIZE - 2,
                left: 0,
                objectFit: 'none',
                position: 'absolute',
                top: 0,
                width: item.inv_width * CELL_SIZE - 2,
              }}
            />
          )}
        </Box>
      </ItemTooltip>
      <Menu
        anchorPosition={
          contextMenuPos != null
            ? { top: contextMenuPos.y, left: contextMenuPos.x }
            : undefined
        }
        anchorReference="anchorPosition"
        onClose={() => setContextMenuPos(null)}
        open={contextMenuPos != null}
      >
        <MenuItem onClick={handleDelete}>{t('ed2r.action.delete')}</MenuItem>
      </Menu>
    </>
  );
}

// ---------------------------------------------------------------------------
// StagingAreaPanel — collapsible right sidebar
// ---------------------------------------------------------------------------

// Width of the open panel: 5 item columns + padding (8px each side) +
// scrollbar gutter (~20px). scrollbarGutter:'stable' on the body always
// reserves that space so items never reflow when a scrollbar appears.
const PANEL_OPEN_WIDTH = 5 * CELL_SIZE + 16 + 20;
// Width of the collapsed panel: just the toggle button.
const PANEL_COLLAPSED_WIDTH = CELL_SIZE;

export function StagingAreaPanel(): React.ReactNode {
  const { t } = useTranslation();
  const { stagingItems, pushHistory, setStagingItemsSilent } = useSaveFiles();
  const { selectedFile } = useSelectedFileContext();
  const { draggedItem } = useItemDragContext();
  const [isOpen, setIsOpen] = useState(true);

  // Read the current tab to determine visibility.
  const [currentTab] = useSessionState<string>(
    `ED2R-selected-tab:${selectedFile?.fileName ?? ''}`,
    'basic',
  );

  const shouldShow = useMemo(
    () => isStagingVisibleForTab(selectedFile, currentTab),
    [selectedFile, currentTab],
  );

  // Drop zone: staging items dragged out can be dropped back here.
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: 'staging-drop-zone',
  });

  const handleClearAll = () => {
    if (stagingItems.length === 0) return;
    pushHistory({ staging: stagingItems });
    setStagingItemsSilent([]);
  };

  if (!shouldShow) return null;

  return (
    <>
      <Divider orientation="vertical" />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 0,
          flexShrink: 0,
          width: isOpen ? PANEL_OPEN_WIDTH : PANEL_COLLAPSED_WIDTH,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            height: CELL_SIZE,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: isOpen ? 1 : 0,
            paddingRight: 0.5,
            justifyContent: isOpen ? 'space-between' : 'center',
            flexShrink: 0,
          }}
        >
          {isOpen && (
            <Typography noWrap={true} sx={{ fontWeight: 600 }} variant="body2">
              {t('ed2r.staging.title')}
            </Typography>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {isOpen && stagingItems.length > 0 && (
              <Tooltip title={t('ed2r.staging.clearAll')}>
                <IconButton onClick={handleClearAll} size="small">
                  <ClearAllIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip
              title={
                isOpen ? t('ed2r.staging.collapse') : t('ed2r.staging.expand')
              }
            >
              <IconButton onClick={() => setIsOpen((v) => !v)} size="small">
                {isOpen ? (
                  <ChevronRightIcon fontSize="small" />
                ) : (
                  <ChevronLeftIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Divider />

        {/* Body */}
        {isOpen && (
          <Box
            ref={setDropRef}
            sx={{
              overflowY: 'auto',
              scrollbarGutter: 'stable',
              flexGrow: 1,
              padding: 1,
              // Highlight the drop zone when a staged item is being dragged
              // back over it so users know they can release here.
              outline:
                draggedItem != null && isOver
                  ? '2px solid hsla(230, 80%, 60%, 0.6)'
                  : draggedItem != null
                    ? '2px dashed hsla(230, 80%, 60%, 0.3)'
                    : 'none',
              outlineOffset: '-2px',
            }}
          >
            {stagingItems.length === 0 ? (
              <Typography
                color="text.secondary"
                sx={{ fontSize: '0.75rem', textAlign: 'center', mt: 1 }}
                variant="body2"
              >
                {t('ed2r.staging.empty')}
              </Typography>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignContent: 'flex-start',
                }}
              >
                {stagingItems.map((item) => (
                  <StagingItemTile key={getUniqueItemID(item)} item={item} />
                ))}
              </Box>
            )}
          </Box>
        )}

        {/* Collapsed: show count badge */}
        {!isOpen && stagingItems.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              mt: 1,
            }}
          >
            <Typography color="text.secondary" variant="caption">
              {stagingItems.length}
            </Typography>
          </Box>
        )}
      </Box>
    </>
  );
}
