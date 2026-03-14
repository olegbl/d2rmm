import { IItem } from 'bridge/third-party/d2s/d2/types';
import { ClickSensor } from 'renderer/react/ed2r/ClickSensor';
import {
  AltPositionID,
  CELL_SIZE,
  EquippedID,
  LocationID,
} from 'renderer/react/ed2r/ED2RConstants';
import {
  getBeltItemPositionIn1D,
  getBeltItemPositionIn2D,
  getUniqueItemID,
} from 'renderer/react/ed2r/ED2RItemPosition';
import {
  SaveFile,
  StashFile,
  useSaveFiles,
} from 'renderer/react/ed2r/ED2RSaveFilesContext';
import { DndContext, useSensor, useSensors } from '@dnd-kit/core';
import React, { useMemo, useRef } from 'react';

export type IItemPosition = Readonly<{
  acceptedItemType?: string;
  altPositionID: AltPositionID;
  equippedID: EquippedID;
  file: SaveFile;
  height: number;
  isAdvancedStash?: boolean;
  isValid: boolean;
  locationID: LocationID;
  isMerc?: boolean;
  overlappingItem?: IItem | null;
  stashTabIndex: number;
  width: number;
  x: number;
  y: number;
}>;

/**
 * Sentinel file used as a placeholder `file` in `IItemPosition` for items
 * being dragged out of the staging area. It is never read or modified.
 */
export const STAGING_SENTINEL_FILE: StashFile = {
  type: 'stash',
  fileName: '__staging_area__',
  stash: {
    version: '',
    type: 'shared',
    pageCount: 0,
    sharedGold: 0,
    kind: 0,
    pages: [],
  },
  edited: false,
  readTime: 0,
  saveTime: null,
};

export type IItemDragContext = Readonly<{
  draggedItem: IItem | null;
  hoveredPosition: IItemPosition | null;
}>;

const ItemDragContext = React.createContext<IItemDragContext | null>(null);

// ============================================================
// Shared validation utilities (also used by clipboard paste)
// ============================================================

export function getContainerItems(
  file: SaveFile,
  locationID: LocationID,
  altPositionID: AltPositionID,
  equippedID: EquippedID,
  stashTabIndex: number,
  isMerc: boolean | undefined,
  itemToExclude?: IItem | null,
): IItem[] {
  const allItems =
    file.type === 'character'
      ? isMerc
        ? file.character.merc_items ?? []
        : file.character.items
      : file.type === 'stash'
        ? file.stash.pages[stashTabIndex]?.items ?? []
        : [];
  return allItems.filter(
    (item) =>
      item !== itemToExclude &&
      item.location_id === locationID &&
      item.alt_position_id === altPositionID &&
      item.equipped_id === equippedID,
  );
}

export type ItemPlacementValidation = Readonly<{
  isValid: boolean;
  conflictingItem: IItem | null;
  invalidReason?: string;
}>;

export function validateItemPlacement(
  item: IItem,
  targetPosition: IItemPosition,
  gridWidth: number,
  gridHeight: number,
  containerItems: IItem[],
): ItemPlacementValidation {
  let isValid = true;
  let invalidReason: string | undefined;
  let conflictingItems = containerItems;

  const { x, y } = targetPosition;
  const width = item.inv_width;
  const height = item.inv_height;

  if (targetPosition.locationID === LocationID.EQUIPPED) {
    const { equippedID } = targetPosition;
    if (
      ((equippedID === EquippedID.RIGHT_HAND ||
        equippedID === EquippedID.LEFT_HAND ||
        equippedID === EquippedID.ALT_RIGHT_HAND ||
        equippedID === EquippedID.ALT_LEFT_HAND) &&
        !item.categories.includes('Weapon') &&
        !item.categories.includes('Any Shield')) ||
      ((equippedID === EquippedID.RIGHT_FINGER ||
        equippedID === EquippedID.LEFT_FINGER) &&
        !item.categories.includes('Ring')) ||
      (equippedID === EquippedID.NECK && !item.categories.includes('Amulet')) ||
      (equippedID === EquippedID.HEAD && !item.categories.includes('Helm')) ||
      (equippedID === EquippedID.TORSO && !item.categories.includes('Armor')) ||
      (equippedID === EquippedID.HANDS &&
        !item.categories.includes('Gloves')) ||
      (equippedID === EquippedID.FEET && !item.categories.includes('Boots')) ||
      (equippedID === EquippedID.WAIST && !item.categories.includes('Belt'))
    ) {
      isValid = false;
      invalidReason = 'Item cannot be equipped in this slot';
    }
    // TODO: handle 2H weapons, off-hand weapons, class-specific equipment
  }

  if (targetPosition.locationID === LocationID.BELT) {
    if (width > 1 || height > 1) {
      isValid = false;
      invalidReason = 'Only 1×1 items can be placed in the belt';
    } else if (
      !item.categories.includes('Potion') &&
      !item.categories.includes('Scroll')
    ) {
      isValid = false;
      invalidReason = 'Only potions and scrolls can be placed in the belt';
    }
    conflictingItems = conflictingItems.filter((conflictItem) => {
      const xy = getBeltItemPositionIn2D(conflictItem.position_x);
      return xy.x === x && xy.y === y;
    });
  }

  if (targetPosition.locationID === LocationID.NONE) {
    if (x + width > gridWidth || y + height > gridHeight) {
      isValid = false;
      invalidReason = 'Item does not fit within the grid bounds';
    }
    conflictingItems = conflictingItems.filter((conflictItem) => {
      const x1 = conflictItem.position_x;
      const y1 = conflictItem.position_y;
      const w1 = conflictItem.inv_width;
      const h1 = conflictItem.inv_height;
      return !(
        (
          x + width <= x1 || // A is completely left of B
          x1 + w1 <= x || // B is completely left of A
          y + height <= y1 || // A is completely above B
          y1 + h1 <= y
        ) // B is completely above A
      );
    });
  }

  if (
    targetPosition.acceptedItemType != null &&
    item.type !== targetPosition.acceptedItemType
  ) {
    isValid = false;
    invalidReason = `This slot only accepts "${targetPosition.acceptedItemType}" items`;
  }

  // advanced stash slots merge same-type quantities — no conflict
  if (
    targetPosition.isAdvancedStash &&
    item.type === targetPosition.acceptedItemType
  ) {
    conflictingItems = [];
  }

  if (conflictingItems.length > 1) {
    isValid = false;
    invalidReason = 'Item overlaps with multiple existing items';
  }

  return {
    isValid,
    conflictingItem: conflictingItems[0] ?? null,
    invalidReason,
  };
}

export function ItemDragContextProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const {
    onChangeSilent,
    pushHistory,
    extendHistory,
    undoSilent,
    stagingItems,
    setStagingItemsSilent,
  } = useSaveFiles();

  const [draggedItem, setDraggedItem] = React.useState<IItem | null>(null);
  const draggedItemRef = useRef<IItem | null>(null);
  const draggedItemInitialOffsetRef = useRef<{ x: number; y: number } | null>(
    null,
  );

  const [hoveredPosition, setHoveredPosition] =
    React.useState<IItemPosition | null>(null);
  const hoveredPositionRef = useRef<IItemPosition | null>(null);

  const draggedPositionRef = useRef<IItemPosition | null>(null);

  // Tracks whether the current drag originated from the staging area.
  const dragFromStagingRef = useRef(false);
  // Tracks whether the cursor is currently over the staging drop zone.
  const dragOverStagingRef = useRef(false);
  // Stable ref so the statically-cached onAttemptDragEnd can read staging items.
  const stagingItemsRef = useRef(stagingItems);
  stagingItemsRef.current = stagingItems;

  const context = useMemo(
    () => ({
      draggedItem,
      hoveredPosition,
    }),
    [draggedItem, hoveredPosition],
  );

  const sensors = useSensors(
    useSensor(ClickSensor, {
      // NOTE: this function is statically cached
      //       and will not be updated on render
      onAttemptDragEnd: () => {
        // Handle drop on the staging area.
        if (dragOverStagingRef.current) {
          if (dragFromStagingRef.current) {
            // Staging → staging: undo the removal so item returns to staging.
            undoSilent();
          } else {
            // Inventory → staging: keep the source file removal, add to staging.
            extendHistory({ staging: stagingItemsRef.current });
            setStagingItemsSilent([
              ...stagingItemsRef.current,
              draggedItemRef.current!,
            ]);
          }
          draggedItemInitialOffsetRef.current = null;
          dragFromStagingRef.current = false;
          dragOverStagingRef.current = false;
          setDraggedItem(null);
          draggedItemRef.current = null;
          draggedPositionRef.current = null;
          setHoveredPosition(null);
          hoveredPositionRef.current = null;
          return true;
        }

        // if the current hovered position isn't valid
        if (!(hoveredPositionRef.current?.isValid ?? false)) {
          return false;
        }

        // When dragging from staging, disallow swaps — the displaced item
        // has no natural "previous position" to return to.
        if (
          dragFromStagingRef.current &&
          hoveredPositionRef.current?.overlappingItem != null
        ) {
          return false;
        }

        if (
          draggedItemRef.current != null &&
          draggedPositionRef.current != null &&
          hoveredPositionRef.current != null
        ) {
          const preDragDstFile = hoveredPositionRef.current.file;
          let newToFile = preDragDstFile;

          // add the dragged item to its new position
          {
            const { x, y } =
              hoveredPositionRef.current.locationID === LocationID.BELT
                ? {
                    x: getBeltItemPositionIn1D(hoveredPositionRef.current),
                    y: 0,
                  }
                : hoveredPositionRef.current;
            const droppedItem: IItem = {
              ...draggedItemRef.current,
              alt_position_id: hoveredPositionRef.current.altPositionID,
              equipped_id: hoveredPositionRef.current.equippedID,
              location_id: hoveredPositionRef.current.locationID,
              position_x: x,
              position_y: y,
            };
            if (newToFile.type === 'character') {
              if (hoveredPositionRef.current.isMerc) {
                newToFile = {
                  ...newToFile,
                  character: {
                    ...newToFile.character,
                    merc_items: (newToFile.character.merc_items ?? [])
                      // add dropped item
                      .concat([droppedItem]),
                  },
                  edited: true,
                };
              } else {
                newToFile = {
                  ...newToFile,
                  character: {
                    ...newToFile.character,
                    items: newToFile.character.items
                      // add dropped item
                      .concat([droppedItem]),
                  },
                  edited: true,
                };
              }
            } else if (newToFile.type === 'stash') {
              const isAdvancedStashTarget =
                hoveredPositionRef.current?.isAdvancedStash === true;
              const acceptedItemType =
                hoveredPositionRef.current?.acceptedItemType;
              const targetPageIndex =
                hoveredPositionRef.current?.stashTabIndex ?? -1;
              const addedQty =
                draggedItemRef.current?.advanced_stash_quantity ?? 1;

              if (isAdvancedStashTarget && acceptedItemType != null) {
                const existingItem = newToFile.stash.pages[
                  targetPageIndex
                ]?.items.find((item) => item.type === acceptedItemType);

                if (existingItem != null) {
                  // merge quantity into existing item
                  newToFile = {
                    ...newToFile,
                    stash: {
                      ...newToFile.stash,
                      pages: newToFile.stash.pages.map((page, index) =>
                        index === targetPageIndex
                          ? {
                              ...page,
                              items: page.items.map((item) =>
                                item.type === acceptedItemType
                                  ? {
                                      ...item,
                                      advanced_stash_quantity:
                                        (item.advanced_stash_quantity ?? 0) +
                                        addedQty,
                                    }
                                  : item,
                              ),
                            }
                          : page,
                      ),
                    },
                    edited: true,
                  };
                } else {
                  // add new item with quantity
                  newToFile = {
                    ...newToFile,
                    stash: {
                      ...newToFile.stash,
                      pages: newToFile.stash.pages.map((page, index) =>
                        index === targetPageIndex
                          ? {
                              ...page,
                              items: page.items.concat([
                                {
                                  ...droppedItem,
                                  advanced_stash_quantity: addedQty,
                                },
                              ]),
                            }
                          : page,
                      ),
                    },
                    edited: true,
                  };
                }
              } else {
                newToFile = {
                  ...newToFile,
                  stash: {
                    ...newToFile.stash,
                    pages: newToFile.stash.pages.map((page, index) =>
                      index === hoveredPositionRef.current?.stashTabIndex
                        ? {
                            ...page,
                            items: page.items
                              // add dropped item
                              .concat([droppedItem]),
                          }
                        : page,
                    ),
                  },
                  edited: true,
                };
              }
            }
          }

          // pick up overlapping item, if any — remove it from the destination
          // file immediately so the save state stays consistent
          // (only for non-staging drags; staging drags disallow swaps above)
          if (hoveredPositionRef.current.overlappingItem != null) {
            const newDraggedItem = hoveredPositionRef.current.overlappingItem;
            const overlappingItemID = getUniqueItemID(newDraggedItem);

            // remove the overlapping item from the destination file
            if (newToFile.type === 'character') {
              if (hoveredPositionRef.current.isMerc) {
                newToFile = {
                  ...newToFile,
                  character: {
                    ...newToFile.character,
                    merc_items: newToFile.character.merc_items?.filter(
                      (item) => getUniqueItemID(item) !== overlappingItemID,
                    ),
                  },
                };
              } else {
                newToFile = {
                  ...newToFile,
                  character: {
                    ...newToFile.character,
                    items: newToFile.character.items.filter(
                      (item) => getUniqueItemID(item) !== overlappingItemID,
                    ),
                  },
                };
              }
            } else if (newToFile.type === 'stash') {
              const targetPageIndex =
                hoveredPositionRef.current.stashTabIndex ?? -1;
              newToFile = {
                ...newToFile,
                stash: {
                  ...newToFile.stash,
                  pages: newToFile.stash.pages.map((page, index) =>
                    index === targetPageIndex
                      ? {
                          ...page,
                          items: page.items.filter(
                            (item) =>
                              getUniqueItemID(item) !== overlappingItemID,
                          ),
                        }
                      : page,
                  ),
                },
              };
            }

            // Extend the history entry started at drag-start with the dst
            // file's pre-drop state. No-op if src and dst are the same file
            // (key already present from drag-start).
            extendHistory({
              files: { [preDragDstFile.fileName]: preDragDstFile },
            });
            onChangeSilent(newToFile);

            const newDraggedPosition = {
              ...hoveredPositionRef.current,
              file: newToFile,
              width: newDraggedItem.inv_width,
              height: newDraggedItem.inv_height,
              overlappingItem: null,
            };
            draggedItemInitialOffsetRef.current = null;
            setDraggedItem(newDraggedItem);
            draggedItemRef.current = newDraggedItem;
            draggedPositionRef.current = newDraggedPosition;
            setHoveredPosition(newDraggedPosition);
            hoveredPositionRef.current = newDraggedPosition;
            return false; // don't end drag
          } else {
            // Extend the history entry started at drag-start with the dst
            // file's pre-drop state. No-op if src and dst are the same file
            // (for staging drags: the source entry has no files key, so this
            // always adds the destination).
            extendHistory({
              files: { [preDragDstFile.fileName]: preDragDstFile },
            });
            onChangeSilent(newToFile);

            draggedItemInitialOffsetRef.current = null;
            setDraggedItem(null);
            draggedItemRef.current = null;
            draggedPositionRef.current = null;
            setHoveredPosition(null);
            hoveredPositionRef.current = null;
          }
        }

        return true;
      },
    }),
  );

  return (
    <DndContext
      onDragCancel={(_event) => {
        // The item was removed from its source (file or staging) at drag-start,
        // and a history entry was pushed at that point.
        // undoSilent() pops that entry and restores all affected state
        // (files and/or staging) without pushing onto the redo stack.
        undoSilent();

        draggedItemInitialOffsetRef.current = null;
        dragFromStagingRef.current = false;
        dragOverStagingRef.current = false;
        setDraggedItem(null);
        draggedItemRef.current = null;
        draggedPositionRef.current = null;
        setHoveredPosition(null);
        hoveredPositionRef.current = null;
      }}
      onDragEnd={(_event) => {
        // handled in onAttemptDragEnd
      }}
      onDragMove={(event) => {
        if (
          event.over?.data.current != null &&
          event.active.rect.current.initial != null &&
          event.active.rect.current.translated != null &&
          draggedItemRef.current != null &&
          draggedPositionRef.current != null
        ) {
          draggedItemInitialOffsetRef.current ??= {
            x: event.active.rect.current.initial.left,
            y: event.active.rect.current.initial.top,
          };

          const overItemPosition = event.over.data.current
            .itemPosition as IItemPosition;
          const overWidth = event.over.data.current.width as number;
          const overHeight = event.over.data.current.height as number;

          const item = draggedItemRef.current;
          const itemPosition = draggedPositionRef.current;
          const width = itemPosition.width;
          const height = itemPosition.height;

          // calculate grid offsets
          let x = Math.round(
            (event.active.rect.current.translated.left -
              event.over.rect.left +
              draggedItemInitialOffsetRef.current.x -
              event.active.rect.current.initial.left) /
              CELL_SIZE,
          );
          let y = Math.round(
            (event.active.rect.current.translated.top -
              event.over.rect.top +
              draggedItemInitialOffsetRef.current.y -
              event.active.rect.current.initial.top) /
              CELL_SIZE,
          );

          // if dragging out of bounds of a grid, don't consider the hover
          // so that the user can click on other UX elements
          if (x < 0 || x >= overWidth || y < 0 || y >= overHeight) {
            setHoveredPosition(null);
            hoveredPositionRef.current = null;
            return;
          }

          // equipped items are always at 0, 0
          if (overItemPosition.locationID === LocationID.EQUIPPED) {
            x = 0;
            y = 0;
          }

          // find other items in the same container, excluding the dragged item
          const containerItems = getContainerItems(
            overItemPosition.file,
            overItemPosition.locationID,
            overItemPosition.altPositionID,
            overItemPosition.equippedID,
            overItemPosition.stashTabIndex,
            overItemPosition.isMerc,
            draggedItemRef.current,
          );

          const { isValid, conflictingItem } = validateItemPlacement(
            item,
            { ...overItemPosition, x, y },
            overWidth,
            overHeight,
            containerItems,
          );

          const newHoveredPosition = {
            ...overItemPosition,
            height,
            isValid,
            overlappingItem: conflictingItem,
            width,
            x,
            y,
          };
          dragOverStagingRef.current = false;
          setHoveredPosition(newHoveredPosition);
          hoveredPositionRef.current = newHoveredPosition;
        } else {
          dragOverStagingRef.current = event.over?.id === 'staging-drop-zone';
          setHoveredPosition(null);
          hoveredPositionRef.current = null;
        }
      }}
      onDragStart={(event) => {
        if (event.active.data.current != null) {
          let item = event.active.data.current.item as IItem;
          const itemPosition = event.active.data.current
            .itemPosition as IItemPosition;
          const fromStaging = event.active.data.current.fromStaging === true;

          dragFromStagingRef.current = fromStaging;

          if (fromStaging) {
            // Item is coming from the staging area — push staging state to
            // history and remove the item from staging. No file is modified.
            pushHistory({ staging: stagingItemsRef.current });
            setStagingItemsSilent(
              stagingItemsRef.current.filter(
                (i) => getUniqueItemID(i) !== getUniqueItemID(item),
              ),
            );

            const updatedPosition: IItemPosition = {
              ...itemPosition,
              width: item.inv_width,
              height: item.inv_height,
            };
            setDraggedItem(item);
            draggedItemRef.current = item;
            draggedPositionRef.current = updatedPosition;
            setHoveredPosition(updatedPosition);
            hoveredPositionRef.current = updatedPosition;
            return;
          }

          // when picking up from an advanced stash slot,
          // pick up a single item instead of the whole stack
          if (itemPosition.isAdvancedStash) {
            item = {
              ...item,
              advanced_stash_quantity: 1,
            };
          }

          // immediately remove the item from its source file so the save
          // state stays consistent with what the UI shows during drag
          let newFile = itemPosition.file;
          if (itemPosition.isAdvancedStash && newFile.type === 'stash') {
            // for advanced stash, decrement quantity instead of removing
            newFile = {
              ...newFile,
              stash: {
                ...newFile.stash,
                pages: newFile.stash.pages.map((page, index) =>
                  index === itemPosition.stashTabIndex
                    ? {
                        ...page,
                        items: page.items
                          .map((i) =>
                            i.type === itemPosition.acceptedItemType
                              ? {
                                  ...i,
                                  advanced_stash_quantity:
                                    (i.advanced_stash_quantity ?? 1) - 1,
                                }
                              : i,
                          )
                          // remove items with 0 quantity
                          .filter(
                            (i) =>
                              i.advanced_stash_quantity == null ||
                              i.advanced_stash_quantity > 0,
                          ),
                      }
                    : page,
                ),
              },
              edited: true,
            };
          } else if (newFile.type === 'character') {
            const removeID = getUniqueItemID(item);
            newFile = {
              ...newFile,
              character: {
                ...newFile.character,
                items: newFile.character.items.filter(
                  (i) => getUniqueItemID(i) !== removeID,
                ),
                merc_items: newFile.character.merc_items?.filter(
                  (i) => getUniqueItemID(i) !== removeID,
                ),
              },
              edited: true,
            };
          } else if (newFile.type === 'stash') {
            const removeID = getUniqueItemID(item);
            newFile = {
              ...newFile,
              stash: {
                ...newFile.stash,
                pages: newFile.stash.pages.map((page, index) =>
                  index === itemPosition.stashTabIndex
                    ? {
                        ...page,
                        items: page.items.filter(
                          (i) => getUniqueItemID(i) !== removeID,
                        ),
                      }
                    : page,
                ),
              },
              edited: true,
            };
          }
          // Push the pre-drag source file state as a new history entry.
          // Drag-end will extend this same entry with the destination file's
          // pre-drop state, giving a single atomic undo step for the whole drag.
          pushHistory({
            files: { [itemPosition.file.fileName]: itemPosition.file },
          });
          onChangeSilent(newFile);

          const updatedPosition = { ...itemPosition, file: newFile };
          setDraggedItem(item);
          draggedItemRef.current = item;
          draggedPositionRef.current = updatedPosition;
          setHoveredPosition(updatedPosition);
          hoveredPositionRef.current = updatedPosition;
        }
      }}
      sensors={sensors}
    >
      <ItemDragContext.Provider value={context}>
        {children}
      </ItemDragContext.Provider>
    </DndContext>
  );
}

export function useItemDragContext(): IItemDragContext {
  const context = React.useContext(ItemDragContext);
  if (context == null) {
    throw new Error(
      'useItemDragContext used outside of a ItemDragContextProvider',
    );
  }
  return context;
}
