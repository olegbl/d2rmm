import { IItem } from 'bridge/third-party/d2s/d2/types';
import { IItemPosition } from 'renderer/react/ed2r/ED2RItemDragContext';

export function getUniqueItemID(item: IItem): string {
  return [
    item.location_id,
    item.alt_position_id,
    item.equipped_id,
    item.position_x,
    item.position_y,
    item.inv_width,
    item.inv_height,
    item.offset ?? -1,
    item.unique_id,
  ].join(':');
}

export function getUniqueItemPositionID({
  altPositionID,
  equippedID,
  file,
  height,
  locationID,
  stashTabIndex,
  width,
  x,
  y,
}: IItemPosition): string {
  return [
    file.fileName,
    locationID,
    altPositionID,
    equippedID,
    stashTabIndex,
    x,
    y,
    width,
    height,
  ].join(':');
}

export function getBeltItemPositionIn2D(x: number): { x: number; y: number } {
  return { x: x % 4, y: 3 - Math.floor(x / 4) };
}

export function getBeltItemPositionIn1D({
  x,
  y,
}: Readonly<{ x: number; y: number }>): number {
  return (3 - y) * 4 + x;
}
