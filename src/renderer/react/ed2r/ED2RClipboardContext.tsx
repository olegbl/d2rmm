import type { IItem } from 'bridge/third-party/d2s/d2/types';
import { LocationID } from 'renderer/react/ed2r/ED2RConstants';
import {
  IItemPosition,
  getContainerItems,
  validateItemPlacement,
} from 'renderer/react/ed2r/ED2RItemDragContext';
import { getBeltItemPositionIn1D } from 'renderer/react/ed2r/ED2RItemPosition';
import { getUniqueItemID } from 'renderer/react/ed2r/ED2RItemPosition';
import { useSaveFiles } from 'renderer/react/ed2r/ED2RSaveFilesContext';
import React, { useMemo } from 'react';

export type ClipboardEntry = Readonly<{
  item: IItem;
  mode: 'copy' | 'cut';
}>;

export type IClipboardContext = Readonly<{
  clipboard: ClipboardEntry | null;
  copyItem: (item: IItem) => void;
  cutItem: (item: IItem, position: IItemPosition) => void;
  pasteItem: (
    targetPosition: IItemPosition,
    gridWidth: number,
    gridHeight: number,
  ) => void;
  clearClipboard: () => void;
}>;

const ClipboardContext = React.createContext<IClipboardContext | null>(null);

export function ClipboardContextProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const { onChange } = useSaveFiles();
  const [clipboard, setClipboard] = React.useState<ClipboardEntry | null>(null);

  const copyItem = React.useCallback((item: IItem) => {
    setClipboard({ item, mode: 'copy' });
  }, []);

  const cutItem = React.useCallback(
    (item: IItem, position: IItemPosition) => {
      const file = position.file;
      let newFile = file;

      if (position.isAdvancedStash && file.type === 'stash') {
        // for advanced stash, decrement quantity instead of removing
        newFile = {
          ...file,
          stash: {
            ...file.stash,
            pages: file.stash.pages.map((page, index) =>
              index === position.stashTabIndex
                ? {
                    ...page,
                    items: page.items
                      .map((i) =>
                        i.type === position.acceptedItemType
                          ? {
                              ...i,
                              advanced_stash_quantity:
                                (i.advanced_stash_quantity ?? 1) - 1,
                            }
                          : i,
                      )
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
      } else if (file.type === 'character') {
        const removeID = getUniqueItemID(item);
        newFile = {
          ...file,
          character: {
            ...file.character,
            items: file.character.items.filter(
              (i) => getUniqueItemID(i) !== removeID,
            ),
            merc_items: file.character.merc_items?.filter(
              (i) => getUniqueItemID(i) !== removeID,
            ),
          },
          edited: true,
        };
      } else if (file.type === 'stash') {
        const removeID = getUniqueItemID(item);
        newFile = {
          ...file,
          stash: {
            ...file.stash,
            pages: file.stash.pages.map((page, index) =>
              index === position.stashTabIndex
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

      onChange(newFile);

      // advanced stash items are cut one at a time
      const clipboardItem = position.isAdvancedStash
        ? { ...item, advanced_stash_quantity: 1 }
        : item;
      setClipboard({ item: clipboardItem, mode: 'cut' });
    },
    [onChange],
  );

  const pasteItem = React.useCallback(
    (targetPosition: IItemPosition, gridWidth: number, gridHeight: number) => {
      if (clipboard == null) return;
      const { item, mode } = clipboard;

      const containerItems = getContainerItems(
        targetPosition.file,
        targetPosition.locationID,
        targetPosition.altPositionID,
        targetPosition.equippedID,
        targetPosition.stashTabIndex,
        targetPosition.isMerc,
      );

      const { isValid, conflictingItem } = validateItemPlacement(
        item,
        targetPosition,
        gridWidth,
        gridHeight,
        containerItems,
      );

      // paste does not allow swapping — the slot must be empty
      if (!isValid || conflictingItem != null) return;

      const { x, y } =
        targetPosition.locationID === LocationID.BELT
          ? { x: getBeltItemPositionIn1D(targetPosition), y: 0 }
          : targetPosition;

      const pastedItem: IItem = {
        ...item,
        alt_position_id: targetPosition.altPositionID,
        equipped_id: targetPosition.equippedID,
        location_id: targetPosition.locationID,
        position_x: x,
        position_y: y,
      };

      let newToFile = targetPosition.file;

      if (newToFile.type === 'character') {
        if (targetPosition.isMerc) {
          newToFile = {
            ...newToFile,
            character: {
              ...newToFile.character,
              merc_items: (newToFile.character.merc_items ?? []).concat([
                pastedItem,
              ]),
            },
            edited: true,
          };
        } else {
          newToFile = {
            ...newToFile,
            character: {
              ...newToFile.character,
              items: newToFile.character.items.concat([pastedItem]),
            },
            edited: true,
          };
        }
      } else if (newToFile.type === 'stash') {
        const isAdvancedStashTarget = targetPosition.isAdvancedStash === true;
        const acceptedItemType = targetPosition.acceptedItemType;
        const targetPageIndex = targetPosition.stashTabIndex ?? -1;
        const addedQty = item.advanced_stash_quantity ?? 1;

        if (isAdvancedStashTarget && acceptedItemType != null) {
          const existingItem = newToFile.stash.pages[
            targetPageIndex
          ]?.items.find((i) => i.type === acceptedItemType);

          if (existingItem != null) {
            newToFile = {
              ...newToFile,
              stash: {
                ...newToFile.stash,
                pages: newToFile.stash.pages.map((page, index) =>
                  index === targetPageIndex
                    ? {
                        ...page,
                        items: page.items.map((i) =>
                          i.type === acceptedItemType
                            ? {
                                ...i,
                                advanced_stash_quantity:
                                  (i.advanced_stash_quantity ?? 0) + addedQty,
                              }
                            : i,
                        ),
                      }
                    : page,
                ),
              },
              edited: true,
            };
          } else {
            newToFile = {
              ...newToFile,
              stash: {
                ...newToFile.stash,
                pages: newToFile.stash.pages.map((page, index) =>
                  index === targetPageIndex
                    ? {
                        ...page,
                        items: page.items.concat([
                          { ...pastedItem, advanced_stash_quantity: addedQty },
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
                index === targetPosition.stashTabIndex
                  ? {
                      ...page,
                      items: page.items.concat([pastedItem]),
                    }
                  : page,
              ),
            },
            edited: true,
          };
        }
      }

      onChange(newToFile);

      // cut items are one-shot; copies stay in clipboard for repeated paste
      if (mode === 'cut') {
        setClipboard(null);
      }
    },
    [clipboard, onChange],
  );

  const clearClipboard = React.useCallback(() => {
    setClipboard(null);
  }, []);

  const context = useMemo(
    () => ({
      clipboard,
      copyItem,
      cutItem,
      pasteItem,
      clearClipboard,
    }),
    [clipboard, copyItem, cutItem, pasteItem, clearClipboard],
  );

  return (
    <ClipboardContext.Provider value={context}>
      {children}
    </ClipboardContext.Provider>
  );
}

export function useClipboardContext(): IClipboardContext {
  const context = React.useContext(ClipboardContext);
  if (context == null) {
    throw new Error(
      'useClipboardContext used outside of a ClipboardContextProvider',
    );
  }
  return context;
}
