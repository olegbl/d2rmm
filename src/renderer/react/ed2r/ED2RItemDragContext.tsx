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
  useSaveFiles,
} from 'renderer/react/ed2r/ED2RSaveFilesContext';
import { DndContext, useSensor, useSensors } from '@dnd-kit/core';
import React, { useMemo, useRef } from 'react';

export type IItemPosition = Readonly<{
  altPositionID: AltPositionID;
  equippedID: EquippedID;
  file: SaveFile;
  height: number;
  isValid: boolean;
  locationID: LocationID;
  overlappingItem?: IItem | null;
  stashTabIndex: number;
  width: number;
  x: number;
  y: number;
}>;

export type IItemDragContext = Readonly<{
  draggedItem: IItem | null;
  hoveredPosition: IItemPosition | null;
}>;

const ItemDragContext = React.createContext<IItemDragContext | null>(null);

export function ItemDragContextProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const { onChange } = useSaveFiles();

  const [draggedItem, setDraggedItem] = React.useState<IItem | null>(null);
  const draggedItemRef = useRef<IItem | null>(null);
  const draggedItemInitialOffsetRef = useRef<{ x: number; y: number } | null>(
    null,
  );

  const [hoveredPosition, setHoveredPosition] =
    React.useState<IItemPosition | null>(null);
  const hoveredPositionRef = useRef<IItemPosition | null>(null);

  const draggedPositionRef = useRef<IItemPosition | null>(null);

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
        // if the current hovered position isn't valid
        if (!(hoveredPositionRef.current?.isValid ?? false)) {
          return false;
        }

        if (
          draggedItemRef.current != null &&
          draggedPositionRef.current != null &&
          hoveredPositionRef.current != null
        ) {
          let newFromFile = draggedPositionRef.current.file;
          let newToFile = hoveredPositionRef.current.file;
          const isWithinFile = newFromFile === newToFile;

          // remove the dragged item from its original position
          {
            const file = newFromFile;
            if (file.type === 'character') {
              newFromFile = {
                ...file,
                character: {
                  ...file.character,
                  items: file.character.items
                    // remove dragged item
                    .filter(
                      (item) =>
                        draggedItemRef.current == null ||
                        getUniqueItemID(item) !=
                          getUniqueItemID(draggedItemRef.current),
                    ),
                },
                edited: true,
              };
            } else if (file.type === 'stash') {
              newFromFile = {
                ...file,
                stash: {
                  ...file.stash,
                  pages: file.stash.pages.map((page, index) =>
                    index === draggedPositionRef.current?.stashTabIndex
                      ? {
                          ...page,
                          items: page.items
                            // remove dragged item
                            .filter(
                              (item) =>
                                draggedItemRef.current == null ||
                                getUniqueItemID(item) !=
                                  getUniqueItemID(draggedItemRef.current),
                            ),
                        }
                      : page,
                  ),
                },
                edited: true,
              };
            }
          }

          // add the dragged item to its new position
          {
            const file = isWithinFile ? newFromFile : newToFile;
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
            if (file.type === 'character') {
              newToFile = {
                ...file,
                character: {
                  ...file.character,
                  items: file.character.items
                    // add dropped item
                    .concat([droppedItem]),
                },
                edited: true,
              };
            } else if (file.type === 'stash') {
              newToFile = {
                ...file,
                stash: {
                  ...file.stash,
                  pages: file.stash.pages.map((page, index) =>
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

          // update the files
          if (isWithinFile) {
            onChange(newToFile);
          } else {
            onChange(newFromFile);
            onChange(newToFile);
          }

          // pick up overlapping item, if any
          if (hoveredPositionRef.current.overlappingItem != null) {
            const newDraggedItem = hoveredPositionRef.current.overlappingItem;
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
        // ignore cancel since it's not valid
        // for a number of use cases like after swapping
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

          let isValid = true;

          // find other items that are in the same general area
          let conflictingItems: IItem[] = (
            overItemPosition.file.type === 'character'
              ? overItemPosition.file.character.items
              : overItemPosition.file.type === 'stash'
                ? overItemPosition.file.stash.pages[
                    overItemPosition.stashTabIndex
                  ].items
                : []
          ).filter(
            (item) =>
              item !== draggedItemRef.current &&
              item.location_id === overItemPosition.locationID &&
              item.alt_position_id === overItemPosition.altPositionID &&
              item.equipped_id === overItemPosition.equippedID,
          );

          if (overItemPosition.locationID === LocationID.EQUIPPED) {
            // equipped items are always at 0, 0
            x = 0;
            y = 0;

            // check if this slot accepts this item type
            if (
              (overItemPosition.equippedID === EquippedID.RIGHT_HAND &&
                !item.categories.includes('Weapon') &&
                !item.categories.includes('Any Shield')) ||
              (overItemPosition.equippedID === EquippedID.LEFT_HAND &&
                !item.categories.includes('Weapon') &&
                !item.categories.includes('Any Shield')) ||
              (overItemPosition.equippedID === EquippedID.ALT_RIGHT_HAND &&
                !item.categories.includes('Weapon') &&
                !item.categories.includes('Any Shield')) ||
              (overItemPosition.equippedID === EquippedID.ALT_LEFT_HAND &&
                !item.categories.includes('Weapon') &&
                !item.categories.includes('Any Shield')) ||
              (overItemPosition.equippedID === EquippedID.RIGHT_FINGER &&
                !item.categories.includes('Ring')) ||
              (overItemPosition.equippedID === EquippedID.LEFT_FINGER &&
                !item.categories.includes('Ring')) ||
              (overItemPosition.equippedID === EquippedID.NECK &&
                !item.categories.includes('Amulet')) ||
              (overItemPosition.equippedID === EquippedID.HEAD &&
                !item.categories.includes('Helm')) ||
              (overItemPosition.equippedID === EquippedID.TORSO &&
                !item.categories.includes('Armor')) ||
              (overItemPosition.equippedID === EquippedID.HANDS &&
                !item.categories.includes('Gloves')) ||
              (overItemPosition.equippedID === EquippedID.FEET &&
                !item.categories.includes('Boots')) ||
              (overItemPosition.equippedID === EquippedID.WAIST &&
                !item.categories.includes('Belt'))
            ) {
              isValid = false;
            }

            // TODO: handle 2H weapons
            // TODO: handle off-hand weapons
            // TODO: handle class specific equipment
          }

          if (overItemPosition.locationID === LocationID.BELT) {
            // if item is too big to fit in the belt
            if (width > 1 || height > 1) {
              isValid = false;
            }

            // check if belt accepts this item type
            if (
              !item.categories.includes('Potion') &&
              !item.categories.includes('Scroll')
            ) {
              isValid = false;
            }

            // determine which item is currently in that slot
            conflictingItems = conflictingItems.filter((item) => {
              const xy = getBeltItemPositionIn2D(item.position_x);
              return xy.x === x && xy.y === y;
            });
          }

          // if over a grid container of some kind (inventory, stash, cube, etc...)
          if (overItemPosition.locationID === LocationID.NONE) {
            // determine if the item fits in this grid
            if (x + width > overWidth || y + height > overHeight) {
              isValid = false;
            }

            // determine which items are curently in those slots
            conflictingItems = conflictingItems.filter((item) => {
              const x0 = x;
              const y0 = y;
              const w0 = width;
              const h0 = height;
              const x1 = item.position_x;
              const y1 = item.position_y;
              const w1 = item.inv_width;
              const h1 = item.inv_height;
              return !(
                x0 + w0 <= x1 || // A is completely left of B
                x1 + w1 <= x0 || // B is completely left of A
                y0 + h0 <= y1 || // A is completely above B
                y1 + h1 <= y0 || // B is completely above A
                false
              );
            });
          }

          // it's okay for there to be *one* conflicting item
          // because we can swap them on drop
          if (conflictingItems.length > 1) {
            isValid = false;
          }

          const newHoveredPosition = {
            ...overItemPosition,
            height,
            isValid,
            overlappingItem: conflictingItems[0],
            width,
            x,
            y,
          };
          setHoveredPosition(newHoveredPosition);
          hoveredPositionRef.current = newHoveredPosition;
        } else {
          setHoveredPosition(null);
          hoveredPositionRef.current = null;
        }
      }}
      onDragStart={(event) => {
        if (event.active.data.current != null) {
          const item = event.active.data.current.item as IItem;
          const itemPosition = event.active.data.current
            .itemPosition as IItemPosition;
          setDraggedItem(item);
          draggedItemRef.current = item;
          draggedPositionRef.current = itemPosition;
          setHoveredPosition(itemPosition);
          hoveredPositionRef.current = itemPosition;
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
