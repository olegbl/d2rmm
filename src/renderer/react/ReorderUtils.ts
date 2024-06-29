import {
  IOrderedItem,
  IOrderedItems,
  IOrderedMod,
  IOrderedSectionHeader,
} from './context/ModsContext';

export function isOrderedMod(item: IOrderedItem): item is IOrderedMod {
  return item.type === 'mod';
}

export function getOrderedMod(item: IOrderedItem): IOrderedMod | null {
  return isOrderedMod(item) ? item : null;
}

export function isOrderedSectionHeader(
  item: IOrderedItem,
): item is IOrderedSectionHeader {
  return item.type === 'sectionHeader';
}

export function getOrderedSectionHeader(
  item: IOrderedItem,
): IOrderedSectionHeader | null {
  return isOrderedSectionHeader(item) ? item : null;
}

export function getAbsoluteIndexFromRenderedIndex(
  targetRenderedIndex: number,
  orderedItems: IOrderedItems,
): number {
  let isHidden = false;
  for (
    let absoluteIndex = 0, renderedIndex = 0;
    absoluteIndex < orderedItems.length;
    absoluteIndex++, renderedIndex++
  ) {
    const item = orderedItems[absoluteIndex];
    if (isOrderedSectionHeader(item)) {
      isHidden = !item.sectionHeader.isExpanded;
    } else if (isHidden) {
      renderedIndex--;
      continue;
    }

    if (renderedIndex === targetRenderedIndex) {
      return absoluteIndex;
    }
  }

  // this should never happen
  return -1;
}

export function getTotalItemCountForSection(
  itemIndex: number,
  orderedItems: IOrderedItems,
): number {
  if (!isOrderedSectionHeader(orderedItems[itemIndex])) {
    return 1;
  }
  const followingItems = orderedItems.slice(itemIndex + 1);
  const followingItemsBeforeNextSectionHeader = followingItems.findIndex(
    isOrderedSectionHeader,
  );
  return (
    1 +
    (followingItemsBeforeNextSectionHeader === -1
      ? followingItems.length
      : followingItemsBeforeNextSectionHeader)
  );
}

export function getHiddenItemCountForSection(
  itemIndex: number,
  orderedItems: IOrderedItems,
): number {
  const isExpanded =
    getOrderedSectionHeader(orderedItems[itemIndex])?.sectionHeader
      ?.isExpanded ?? true;
  return isExpanded
    ? 0
    : getTotalItemCountForSection(itemIndex, orderedItems) - 1;
}
