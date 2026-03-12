# ED2R Feature Roadmap

This document lists planned features for the ED2R save file editor, grouped by area. It is intended as a living reference for implementation planning — not a strict priority order.

---

## Current State (Already Implemented)

> Last updated: 2026-03-11

- Load/save `.d2s` character files and shared/private stash files
- **Basic tab**: character name, level, experience, realm, status flags (hardcore, expansion, died, ladder); strength, dexterity, vitality, energy, unspent stat/skill points, HP/mana/stamina, on-character gold, stashed gold, deaths counter
- **Skills tab**: view and edit skill point allocations (including unallocated points)
- **Equipment tab**: drag-and-drop equipped items (head, neck, torso, hands, feet, waist, rings, alt weapons, swap set)
- **Inventory tab**: inventory grid (size from game data) with drag-and-drop
- **Stash tab**: character personal stash with drag-and-drop
- **Cube tab**: Horadric Cube contents with drag-and-drop
- **Mercenary tab**: view/edit mercenary equipped items (weapon, off-hand, head, torso, gloves, feet)
- **Waypoints tab**: toggle waypoints per act across Normal/Nightmare/Hell
- **Raw tab**: read-only JSON dump of entire save file
- Cross-container item copy/cut/paste (clipboard, already works across files)
- Item context menu: copy, cut, delete, quantity (for advanced stash)
- Item description tooltips with property display; item sprite rendering from game data
- Shared/private stash with multiple pages; stash tab add/delete
- Advanced stash tabs (Materials, Gems, Runes) with quantity editing
- Unsaved-change indicator; auto-backup before write; revert to disk
- **Undo/Redo** (§7.1) — global history stack (up to 50 entries); Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z; Undo and Redo buttons in both Character and Stash toolbars; single undo step for drags (including cross-file and swap chains); history cleared on save or revert

---

## 1. Item Editing

The most impactful missing feature area.

### 1.1 Item Editor Dialog

An "Edit Item" dialog accessible from the item context menu (right-click → Edit), covering all items in any container.

**Base item editing:**
- Change base item type (e.g. upgrade a Long Sword to a Phase Blade)
  - Must validate the new base is compatible with the item's quality/runeword
  - Upgrading to exceptional/elite: automate stat recalculation (defense, damage ranges, req str/dex)
  - Preserve socketed runes/gems where socket count allows
- Toggle **ethereal** flag
- Set **current and max durability** (including indestructible flag)
- Toggle **identified** flag
- Set **quantity** (for stackable items: bolts, arrows, keys, scrolls, potions)
- Toggle **personalized** flag and set the personalization name
- Set **item level** (ilvl)

**Socket editing:**
- Set number of sockets (0–6, capped by base item max)
- Remove socketed runes/gems, or reorder them
- Insert a specific rune/gem/jewel into a socket (opens an item picker)

**Magic properties (affixes) editing:**
- Display all `magic_attributes` as editable rows: stat ID, value(s)
- Add a new property from a searchable dropdown (populated from `itemstatcost.txt`)
- Remove a property
- Reorder properties
- Edit individual numeric values with clamping to sane ranges

**Runeword support:**
- Detect valid runeword combinations automatically when runes are socketed in the correct order
- Allow forcing a `runeword_id` override to manually apply a runeword name/bonus
- Display which runeword is applied (if any)

### 1.2 Item Creation

"Create Item" button in any container panel (inventory, stash tab, cube):
- Pick base type from searchable list (grouped by category: weapons, armor, misc)
- Choose quality tier and fill in quality-specific fields:
  - Magic: prefix and suffix IDs from dropdown
  - Rare: rare name IDs and up to 3 prefix/3 suffix affix IDs
  - Unique: select which unique variant (UniqueItems.txt)
  - Set: select which set item (SetItems.txt)
- Optionally set initial sockets, ethereal, ilvl
- Place the new item into the container at the chosen position

### 1.3 Bulk Item Operations

Available via the container context menu or toolbar:
- **Identify All** — set the identified flag on every item in the current container
- **Repair All** — restore durability to max on every item in the current container
- **Perfect All** — maximize all rolled numeric values within their valid range
- **Socket All** — fill every socketable item to its maximum sockets
- **Remove All** — clear all items from current container (with confirmation)

---

## 2. Quest Editing

The `IQuests` data model is fully parsed and round-tripped already — only the UI tab is missing.

### 2.1 Quest Completion Tab

A new **Quests** tab showing all quests across all three difficulties (Normal / Nightmare / Hell):

- Toggle individual quest completion flags
- **Complete All Quests** button per difficulty (with confirmation)
- **Reset All Quests** button per difficulty (with confirmation)
- Show act separators and distinguish mandatory quests vs optional quests

**Quests of particular interest** (stat/skill rewards or commonly-reset gates):
- Den of Evil (respec token / extra skill point)
- Radament's Lair (extra skill point)
- The Golden Bird (extra 20 HP)
- Lam Esen's Tome (extra 5 stat points)
- Izual (2 extra skill points)
- Anya (personalization reward, resistance bonus)
- Shenk the Overseer (extra skill point)
- Larzuk (socket reward)
- Hellforge (rune reward)
- Cow King killed flag (blocks re-opening the portal)

### 2.2 Stat-Granting Quest Bonuses

Show a summary of which stat/skill bonuses the character has earned from quests, and allow toggling them independently of the quest flags (since the game tracks bonuses separately from completion bits).

---

## 3. Stash Management

### 3.1 Stash Tab Operations

Tab add/delete already works. Add:
- **Reorder tabs** — drag tabs to reorder in the tab bar
- **Duplicate tab** — clone a tab and all its items (useful for backup before edits)

### 3.2 Shared Stash Gold

`IStash.sharedGold` is already parsed — add an editable field in the stash editor UI.

### 3.3 Item JSON Copy/Paste

Allow copying an item to the clipboard as a JSON string (the same structure as the raw tab), and pasting a JSON string back to create an item. This is a lightweight sharing mechanism: users can post their item JSON in a forum/Discord and others can paste it directly.

---

## 4. Item Transfer & Cross-Character Operations

### 4.1 Quick Move to Preferred Location

Keyboard shortcut (e.g. Shift+click or Alt+click) to instantly move an item to a user-configured preferred destination (e.g. "always send to shared stash tab 1"). Complements the existing cross-file clipboard.

### 4.2 Item Staging Area (Virtual Container)

Ctrl+click moves an item to a persistent virtual staging area that is always visible regardless of which file is currently selected. Users can stage items from Character A, switch to Character B, and drag them out of the staging area. The staging area is local to the session and is not persisted to disk — it works purely as an in-app transfer buffer.

### 4.3 Item Search

A global search panel (Ctrl+F or toolbar) that:
- Searches all loaded files (characters + stashes) simultaneously
- Filters by: item name, type, quality, affix name, or property (e.g. "all items with Life Steal")
- Shows results as a list with the source file and container
- Clicking a result focuses the item in its container

---

## 5. Mercenary Editing

The current merc tab shows equipment only. Add:

- **Act/type selector**: change which mercenary the character employs (Act 1 Rogue, Act 2 Desert Warrior, Act 3 Iron Wolf, Act 5 Barbarian) — and optionally the merc variant (offensive/defensive/prayer, etc.)
- **Mercenary level** — editable
- **Mercenary experience** — editable
- **Mercenary name** — selectable from the appropriate name pool for their act/type
- **Resurrect mercenary** — clear the dead flag if the merc has died

---

## 6. Advanced / Power User Features

### 6.1 Runeword Builder

A dedicated panel or dialog:
- List all runewords with their rune combinations and required socket counts
- Pick a target base from the player's current items or create a new one
- Automatically socket the base with the correct runes in the right order
- Validate: correct item type, enough sockets, correct socket count

### 6.2 Save Validation & Repair

Run a validation pass on a save file and report issues:
- Items placed outside their container's bounds
- Items with invalid affix IDs (IDs that don't exist in game data)
- Socket count mismatches (`socketed_items` array length ≠ `num_socketed` field)
- Duplicate item IDs
- Offer auto-repair for each detected issue

### 6.3 Item Templates (via `.d2i` file)

Allow saving an item to a `.d2i` file on disk (user-chosen path), and loading a `.d2i` file to paste the item into any container. Users manage their own template library through the file system. No app-internal template storage needed.

### 6.4 Difficulty / Progression

- **Set current difficulty / act** — useful for unlocking Hell mode without completing Normal/Nightmare
- **Unlock all acts** for a given difficulty (sets act completion flags)

### 6.5 Corpse Clearing

- Show the character's corpse items (if they have a death pending)
- Move corpse items back to inventory / stash
- Clear the corpse (simulate picking it up)

### 6.6 NPC Dialogue Flag Reset

The save tracks which NPC introductions and congratulations messages the character has heard (`INPCS` block — ~40 NPCs per difficulty). A **"Reset NPC greetings"** button per difficulty replays all intro dialogues — useful for completionist runs or mod testing.

### 6.7 Iron Golem

- Show / edit the Iron Golem item (the item the Necromancer sacrificed)
- Destroy the golem (clear the golem item) to recover the character state

---

## 7. UX / Quality of Life

### 7.1 Undo / Redo ✅ *Implemented*

Global history stack (max 50 entries) stored in `ED2RSaveFilesContext`. History entries are `{ [fileName]: SaveFile }` snapshots, supporting atomic multi-file undo (e.g. cross-file drag, future Repair All). Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z keyboard shortcuts; Undo and Redo buttons in both toolbars. Drag is a single undo step via `pushHistory` at drag-start + `extendHistory` at drag-end (replaces the frame rather than pushing). History cleared on save or revert.

### 7.2 Stash Diff View

Show a diff between the original (on-disk) state and current edited state of a stash, highlighting added/moved/removed items before saving.

### 7.3 Filter / Highlight Items

Highlight items in the grid that match a filter string (name, property, quality) — non-matching items are dimmed.

### 7.4 Keyboard Navigation

- Arrow keys to move focus between item slots
- Enter / Space to open item editor dialog for focused item
- Delete key to remove focused item (with confirmation)

### 7.5 Right-Click Context Menu (Expand Existing)

The existing context menu has copy/cut/delete/quantity. Extend it with:
- **Edit Item** (opens editor dialog — requires §1.1)
- **Identify / Unidentify**
- **Repair** (restore durability)
- **Perfect** (maximize rolls)
- **Add max sockets**
- **Move to...** submenu (Stash / Inventory / Cube)
- **Duplicate** (copy + paste into same container)

---

## Implementation Notes

- **Item editing dialog** (§1.1) is the highest-value missing feature; most other item features build on it
- **Quest editing** (§2) — data model fully exists; only the UI tab is missing — low risk
- **Shared stash gold** (§3.2) — `IStash.sharedGold` is parsed; trivial single-field addition
- **Stash tab reorder/duplicate** (§3.1) — self-contained, low risk
- **Undo/redo** (§7.1) — ✅ implemented; future multi-file mutations (Repair All, etc.) should use `pushHistory(entry)` + `onChangeSilent()` so all changes undo atomically in one step
- **Item search** (§4.3) — read-only across all loaded data; low risk, high value
- The `@dschu012/d2s` library (already used) handles binary parsing/serialization; item property IDs and value ranges come from `itemstatcost.txt` which is already loaded into `GameData`
