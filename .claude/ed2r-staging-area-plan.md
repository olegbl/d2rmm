# ED2R Staging Area — Implementation Plan

## Overview

A collapsible right-sidebar panel ("Staging Area") that acts as a virtual item buffer
across save files. Ctrl+click moves an item from any file into staging; items can be
dragged from staging into any inventory grid. Fully integrated with undo/redo.

---

## Files to Modify

| File | Change |
|---|---|
| `src/renderer/react/ed2r/ED2RSaveFilesContext.tsx` | Extend `HistoryEntry`, add staging state |
| `src/renderer/react/ed2r/ED2RItemDragContext.tsx` | Handle drag-from-staging |
| `src/renderer/react/ed2r/ED2R.tsx` | Ctrl+click in `InventoryGridItem`, layout |
| 14 locale files | New strings |

## Files to Create

| File | Purpose |
|---|---|
| `src/renderer/react/ed2r/ED2RStagingAreaPanel.tsx` | Collapsible right-sidebar panel |

---

## Step 1 — Extend `HistoryEntry` and `SaveFilesContext`

### Change `HistoryEntry` type

**Before:**
```typescript
export type HistoryEntry = { [fileName: string]: SaveFile };
```

**After:**
```typescript
export type HistoryEntry = {
  files?: { [fileName: string]: SaveFile };
  staging?: IItem[];
};
```

### Add staging state inside `SaveFilesContextProvider`

```typescript
const [stagingItems, setStagingItems] = React.useState<IItem[]>([]);
const stagingItemsRef = useRef(stagingItems);
stagingItemsRef.current = stagingItems;
```

### Add to `ISaveFilesContext`

```typescript
stagingItems: IItem[];
setStagingItemsSilent: (items: IItem[]) => void;
```

`setStagingItemsSilent` updates the staging array without touching history. Used in
combination with `pushHistory` + `onChangeSilent` for atomic multi-state operations.

### Update history consumers

Every function that reads/writes history entries must be updated for the new shape:

| Function | Change |
|---|---|
| `onChange` | Push `{ files: { [fileName]: prev } }` |
| `pushHistory` | Accepts `HistoryEntry` with new shape (no internal change needed) |
| `extendHistory` | Merges `patch.files` into `top.files`; merges `patch.staging` if not already set |
| `undoSilent` | Restores `entry.files` to `changedSaveFiles`; restores `entry.staging` to staging state |
| `onUndo` | Same restore logic + captures current staging snapshot for redo |
| `onRedo` | Same restore logic + captures current staging snapshot for undo |
| `onReset` | Clears staging (`setStagingItems([])`) |

### Atomic "move to staging" pattern (used by Ctrl+click)

```
pushHistory({ files: { [fileName]: prevFile }, staging: prevStagingItems })
onChangeSilent(fileWithItemRemoved)
setStagingItemsSilent([...prevStagingItems, item])
```

Single undo step reverts both the file removal and the staging addition.

---

## Step 2 — Drag-from-staging in `ED2RItemDragContext`

### Sentinel file

```typescript
export const STAGING_SENTINEL_FILE: SaveFile = {
  type: 'stash',
  fileName: '__staging_area__',
  stash: { pages: [] },
  edited: false,
  readTime: 0,
  saveTime: null,
};
```

`IItemPosition.file` stays non-nullable. Staging draggables use this sentinel so no
type changes ripple through call sites.

### New ref

```typescript
const dragFromStagingRef = useRef(false);
```

### `onDragStart` changes

If `event.active.data.current.fromStaging === true`:
- Set `dragFromStagingRef.current = true`
- Push `{ staging: currentStagingItems }` to history (no `files` key)
- `setStagingItemsSilent(stagingItems without dragged item)`
- Skip all file-mutation code
- Set `draggedItem`, `draggedItemRef`, `draggedPositionRef`, `hoveredPositionRef` as normal

Otherwise (normal drag from file):
- Set `dragFromStagingRef.current = false`
- Existing logic unchanged, but update `pushHistory` call to `{ files: { [name]: file } }`

### `onAttemptDragEnd` changes

If `dragFromStagingRef.current`:
- **Disallow swaps**: if `hoveredPositionRef.current.overlappingItem != null` → return `false`
  (no natural "previous position" to send the displaced item back to)
- On valid drop: `extendHistory({ files: { [dstFile.fileName]: preDragDstFile } })`
  (no source file to add — staging was already captured at drag-start)

Otherwise: existing logic unchanged (update `extendHistory` call shape only).

### `onDragCancel` changes

No logic change — `undoSilent()` already handles everything:
- For staging drags: restores `staging` from the entry pushed at drag-start ✓
- For file drags: restores `files` as before ✓

### Update all `pushHistory` / `extendHistory` call shapes

```typescript
// Before
pushHistory({ [itemPosition.file.fileName]: itemPosition.file });
extendHistory({ [preDragDstFile.fileName]: preDragDstFile });

// After
pushHistory({ files: { [itemPosition.file.fileName]: itemPosition.file } });
extendHistory({ files: { [preDragDstFile.fileName]: preDragDstFile } });
```

---

## Step 3 — `InventoryGridItem` Ctrl+click (in `ED2R.tsx`)

Override `onPointerDown` after spreading dnd-kit `listeners` to intercept before
`ClickSensor` activates:

```typescript
const { pushHistory, onChangeSilent, stagingItems, setStagingItemsSilent } =
  useSaveFiles();

const handlePointerDown = (e: React.PointerEvent) => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    e.stopPropagation(); // prevents ClickSensor from starting drag
    if (itemPosition != null && file != null) {
      // atomic: remove from file + add to staging in one history entry
      const prevFile = file;
      const newFile = removeItemFromFile(file, item, itemPosition);
      pushHistory({ files: { [prevFile.fileName]: prevFile }, staging: [...stagingItems] });
      onChangeSilent(newFile);
      setStagingItemsSilent([...stagingItems, item]);
    }
    return;
  }
  listeners?.onPointerDown?.(e); // pass through to dnd-kit
};

<InventoryItem
  ref={setNodeRef}
  {...attributes}
  {...listeners}
  onPointerDown={handlePointerDown}  // overrides listeners.onPointerDown (last wins)
  onContextMenu={handleContextMenu}
  ...
/>
```

`removeItemFromFile` is an extracted helper (same logic as the existing inline removal
in `onDragStart` and `cutItem`).

---

## Step 4 — `ED2RStagingAreaPanel.tsx` (new file)

### Layout

Collapsible right sidebar. Open width: ~240px. Collapsed width: ~40px.
Toggle stored in local `useState<boolean>`.

When collapsed: a vertical icon button with a `ChevronLeft`/`ChevronRight` icon
and a badge showing item count (if > 0).

When expanded:
- Header row: title + collapse button + (if items exist) clear-all icon button
- Scrollable body: item grid
- Empty state: muted text `ed2r.staging.empty`

### Item grid

Items displayed as small tiles (fixed cell-size sprites), wrapping as needed.
Each tile is the same `InventoryItem` component used in the inventory grids,
but rendered inline (not `position: absolute`), sized at `item.inv_width × CELL_SIZE`
by `item.inv_height × CELL_SIZE`.

### Per-item interactions

| Interaction | Behavior |
|---|---|
| Hover | Tooltip with item name + description (same `InventoryGridItemTooltip`) |
| Left drag | `useDraggable` with `data: { item, itemPosition, fromStaging: true }` where `itemPosition.file = STAGING_SENTINEL_FILE` |
| Right-click | Context menu: single "Delete" option → `pushHistory({ staging }) + setStagingItemsSilent(remove)` |
| Ctrl+click | `moveToFile(item)` — see below |

### `moveToFile(item)` logic

Called when Ctrl+clicking a staged item. Searches the currently selected file for the
first valid empty position, then does the atomic move.

**Target grid priority:**

| Selected file type | Search order |
|---|---|
| `character` | Inventory → Cube → Character stash tab |
| `stash` | Current stash page (from `useStashTabIndex()`) |
| none | No-op + tooltip |

**Grid dimensions** come from `inventory.txt` via `useGameFiles()` (same lookups as
`CharacterInventoryTab`, `CharacterCubeTab`, `StashTab`).

**Position scan:**
```
for y in 0..gridHeight - item.inv_height:
  for x in 0..gridWidth - item.inv_width:
    if validateItemPlacement(..., {x, y}, ...).isValid
       && conflictingItem == null:
      return {x, y}
return null
```

**On success:** atomic move:
```
pushHistory({ files: { [targetFile.fileName]: prevTargetFile }, staging: prevStagingItems })
onChangeSilent(fileWithItemAdded)
setStagingItemsSilent(stagingItems without item)
```

**On failure (no position / no file selected):** show a brief `Tooltip` with
`ed2r.staging.noValidLocation` text. Item stays in staging.

---

## Step 5 — Layout (in `ED2R.tsx`)

Add staging panel as a right sibling of the main content area, only when files are loaded:

```
┌─────────────────────────────────────────────┐
│ [File list 240px] │ [Main content flex:1] │ │ [Staging panel 40–240px] │
└─────────────────────────────────────────────┘
```

```tsx
{isLoaded && <Divider orientation="vertical" />}
{isLoaded && <StagingAreaPanel />}
```

---

## Step 6 — Localization (14 files)

New keys — add to `en-US.json` and translate into all 13 other locales:

| Key | English value |
|---|---|
| `ed2r.staging.title` | `"Staging Area"` |
| `ed2r.staging.empty` | `"Ctrl+click items to move them here"` |
| `ed2r.staging.noValidLocation` | `"No valid location in the current view"` |
| `ed2r.staging.collapse` | `"Collapse staging area"` |
| `ed2r.staging.expand` | `"Expand staging area"` |
| `ed2r.staging.clearAll` | `"Clear all staged items"` |

---

## Implementation Order

1. `ED2RSaveFilesContext.tsx` — HistoryEntry + staging state
2. `ED2RItemDragContext.tsx` — drag-from-staging + updated history call shapes
3. `ED2R.tsx` — Ctrl+click in `InventoryGridItem` + layout
4. `ED2RStagingAreaPanel.tsx` — new panel component
5. Locale files — all 14
