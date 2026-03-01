# D2RMM Mod Code Examples & Patterns

Real examples drawn from https://github.com/olegbl/d2rmm.mods. Read the actual mod files there (or from the local path in `.claude/local.md` if available) for full context.

---

## Pattern 1 — Modify a TSV file (most common)

**Source**: `IncreaseStackSize`, `ShowItemLevel`, `TownCast`, `SingleplayerRunewords`, etc.

```javascript
// Always process both the regular and base\ variant
['global\\excel\\misc.txt', 'global\\excel\\base\\misc.txt'].forEach((fileName) => {
  const data = D2RMM.readTsv(fileName);
  if (!data) return; // file may not exist in all versions/modes

  data.rows.forEach((row) => {
    // Skip blank/separator rows
    if (row.name === '' || row.name === 'Expansion') return;

    // Check a condition before modifying
    if (row.code === 'tbk' || row.code === 'ibk') {
      row.maxstack = String(config.tomeStackSize); // values are strings
    }
  });

  D2RMM.writeTsv(fileName, data);
});
```

**Key rules:**
- `if (!data) return;` — some files only exist in pre-extracted data
- All row values are strings — set with `String(value)` or just assign a number (D2RMM coerces)
- Filter blank rows before modifying

---

## Pattern 2 — Modify a localization JSON (string table)

**Source**: `NumberedRuneNames`, `ShortPotionNames`, `ShortGemNames`, `ShortScrollNames`

```javascript
const fileName = 'local\\lng\\strings\\item-runes.json';
const strings = D2RMM.readJson(fileName);

strings.forEach((entry) => {
  // entry.Key is the string identifier (e.g. 'r01', 'r02'...)
  if (!entry.Key.match(/^r[0-9]{2}$/)) return;

  const runeNumber = entry.Key.replace(/^r0?/, ''); // '01' -> '1'

  // Modify all language columns
  for (const lang in entry) {
    if (lang === 'id' || lang === 'Key') continue;
    entry[lang] = entry[lang] + ' (' + runeNumber + ')';
  }
});

D2RMM.writeJson(fileName, strings);
```

**For item-names.json (potions, gems, etc.)**, look up entries by `entry.Key` value:
```javascript
const names = D2RMM.readJson('local\\lng\\strings\\item-names.json');
const entry = names.find(e => e.Key === 'TownPortalScroll');
if (entry) {
  for (const lang in entry) {
    if (lang !== 'id' && lang !== 'Key') {
      entry[lang] = 'TP'; // shorten in every language
    }
  }
}
D2RMM.writeJson('local\\lng\\strings\\item-names.json', names);
```

---

## Pattern 3 — Modify a UI layout JSON (nested widget tree)

**Source**: `ExpandedStash`, `ExpandedInventory`, `SettingsFontFix`, `CustomItemColors`, `DisableBattleNet`

UI JSON is a deeply nested widget tree. Never replace the whole file — traverse to find specific nodes.

```javascript
// Helper: find a node by its 'name' field anywhere in the tree
function findNode(node, name) {
  if (node?.name === name) return node;
  if (Array.isArray(node?.children)) {
    for (const child of node.children) {
      const result = findNode(child, name);
      if (result != null) return result;
    }
  }
  return null;
}

// Helper: walk the tree, calling handler for each node
function walkNodes(node, handler) {
  handler(node);
  if (Array.isArray(node?.children)) {
    node.children.forEach(child => walkNodes(child, handler));
  }
}

// Usage
const profileHD = D2RMM.readJson('global\\ui\\layouts\\_profilehd.json');

// Find and modify a specific named node
const fontColor = findNode(profileHD, 'FontColorGold');
if (fontColor != null) {
  fontColor.fields.r = 255;
  fontColor.fields.g = 165;
  fontColor.fields.b = 0;
  fontColor.fields.a = 255;
}

D2RMM.writeJson('global\\ui\\layouts\\_profilehd.json', profileHD);
```

**For removing a widget** (e.g. DisableBattleNet hides the online button):
```javascript
function removeNode(node, name) {
  if (!Array.isArray(node?.children)) return;
  node.children = node.children.filter(child => {
    if (child?.name === name) return false; // remove this one
    removeNode(child, name); // recurse
    return true;
  });
}

const mainMenu = D2RMM.readJson('global\\ui\\layouts\\mainmenupanelhd.json');
removeNode(mainMenu, 'OnlineButtonWidget');
D2RMM.writeJson('global\\ui\\layouts\\mainmenupanelhd.json', mainMenu);
```

---

## Pattern 4 — Copy asset files (graphics, videos)

**Source**: `SkipIntroVideos`, `ExpandedStash`, `StackableRunes`

```javascript
// Register files for uninstall tracking (important for -direct mode)
D2RMM.readTxt('hd\\global\\video\\blizzardlogos.webm');
D2RMM.readTxt('hd\\global\\video\\logoanim.webm');

// Copy the mod's hd\ folder contents to the output hd\ folder
D2RMM.copyFile(
  'hd',    // path in mod folder: <mod>/hd/
  'hd',    // path in output:     data/hd/
  true     // overwrite conflicts
);
```

The `readTxt` calls before `copyFile` are a convention that tells D2RMM's uninstall system to track those files. Without it, disabling the mod in direct mode won't remove the copied files.

---

## Pattern 5 — Detect other installed mods

**Source**: `ExpandedStash`, `ExpandedCube` (they detect each other and use compatible sprites)

```javascript
const modList = D2RMM.getModList();
const hasExpandedCube = modList.some(m => m.id === 'ExpandedCube' && m.installed);

if (hasExpandedCube) {
  // Use compatible sprites
  D2RMM.copyFile('hd-with-cube', 'hd', true);
} else {
  D2RMM.copyFile('hd', 'hd', true);
}
```

---

## Pattern 6 — Add cube recipes

**Source**: `SocketPunching`, `HoradricForging`, `StackableGems`, `StackableRunes`

```javascript
['global\\excel\\cubemain.txt', 'global\\excel\\base\\cubemain.txt'].forEach((fileName) => {
  const cubemain = D2RMM.readTsv(fileName);
  if (!cubemain) return;

  // Add a new recipe at the end
  cubemain.rows.push({
    description: 'Socket Any Weapon',
    enabled: '1',
    version: '100',       // 100 = expansion
    numinputs: '2',
    'input 1': 'weap,nos', // any non-socketed weapon
    'input 2': 'El',       // El rune (add cost)
    output: 'useitem',     // output = same item type as input 1
    'mod 1': 'sock',       // add sockets
    'mod 1 min': '1',
    'mod 1 max': '6',
    '*eol': '0',
  });

  D2RMM.writeTsv(fileName, cubemain);
});
```

**Common input qualifiers:**
- `'weap'` — any weapon type
- `'armo'` — any armor type
- `'weap,sock'` — socketed item
- `'weap,nos'` — un-socketed item
- `'weap,eth'` — ethereal
- `'weap,uni'` — unique quality
- `'r01'` — specific rune (El rune)

**Common outputs:**
- `'useitem'` — same item as a specific input (preserves stats)
- `'usetype'` — same item type
- `'hax'` — specific item code

---

## Pattern 7 — Config-driven TSV modification

**Source**: `TownCast` (checkbox), `IncreaseStackSize` (numbers), `IncreaseMonsterDensity` (multiplier)

```javascript
// Using a checkbox config
skills.rows.forEach((row) => {
  if (row.charclass === '' || row.passive === '1') return;
  if (config.allSkills || ALLOWED_SKILLS.indexOf(row.skill) !== -1) {
    row.InTown = '1';
  }
});

// Using a number config (multiplier)
levels.rows.forEach((row) => {
  if (row.Name === '') return;
  ['MonDen', 'MonDen(N)', 'MonDen(H)'].forEach((col) => {
    const current = parseInt(row[col] || '0', 10);
    if (current > 0) {
      row[col] = String(Math.round(current * config.multiplier));
    }
  });
});

// Using a select config
const COLOR_MAP = {
  gold: '$FontColorGold',
  white: '$FontColorWhite',
  gray: '$FontColorGray',
};
const color = COLOR_MAP[config.colorPreset] || COLOR_MAP.gold;
```

---

## Pattern 8 — Modify drop tables (NoDrop / rarity)

**Source**: `GuaranteedDrops`, `IncreaseDroprate`

```javascript
// Simulate /players N effect on NoDrop
const N = config.players;

['global\\excel\\treasureclassex.txt', 'global\\excel\\base\\treasureclassex.txt'].forEach((fileName) => {
  const tc = D2RMM.readTsv(fileName);
  if (!tc) return;

  tc.rows.forEach((row) => {
    if (row['Treasure Class'] === '') return;

    const noDrop = parseInt(row.NoDrop || '0', 10);
    if (noDrop > 0) {
      // Calculate total weight of picks
      let totalWeight = 0;
      for (let i = 1; i <= 10; i++) {
        const prob = parseInt(row['Prob' + i] || '0', 10);
        totalWeight += prob;
      }
      // Apply players formula
      const newNoDrop = Math.floor(
        noDrop / (1 + (N - 1) * noDrop / (noDrop + totalWeight))
      );
      row.NoDrop = String(newNoDrop);
    }
  });

  D2RMM.writeTsv(fileName, tc);
});
```

---

## Pattern 9 — Version guard

**Source**: `ExpandedStash` and any mod using v1.7+ APIs

```javascript
if (D2RMM.getVersion() < 1.7) {
  throw new Error(
    'This mod requires D2RMM v1.7 or later. Please update D2RMM.'
  );
}
```

---

## Pattern 10 — Modify monster resistances

**Source**: `RemoveMonsterImmunities`

```javascript
const maxRes = config.maxResistance; // e.g. 95
const RES_COLS = ['ResFi', 'ResCo', 'ResLi', 'ResPo', 'ResLt', 'ResMa',
                   'ResFiN', 'ResCoN', 'ResLiN', 'ResPoN', 'ResLtN', 'ResMaN',
                   'ResFiH', 'ResCoH', 'ResLiH', 'ResPoH', 'ResLtH', 'ResMaH'];

['global\\excel\\monstats.txt', 'global\\excel\\base\\monstats.txt'].forEach((fileName) => {
  const monstats = D2RMM.readTsv(fileName);
  if (!monstats) return;

  monstats.rows.forEach((row) => {
    if (row.Id === '') return;
    RES_COLS.forEach((col) => {
      const val = parseInt(row[col] || '0', 10);
      if (val > maxRes) {
        row[col] = String(maxRes);
      }
    });
  });

  D2RMM.writeTsv(fileName, monstats);
});
```

---

## Common Mistakes to Avoid

1. **Forgetting `base\` files**: Always use the both-files array pattern.
2. **Comparing numbers to strings**: TSV values are strings. Use `parseInt(row.val, 10)` before math; assign back with `String()`.
3. **Skipping the `if (!data) return`**: Some files don't exist in all game configurations.
4. **Using `copyFile` for TSV/JSON**: This bypasses the merge system and breaks compatibility with other mods that touch the same file. Only use `copyFile` for non-mergeable assets.
5. **Modifying all rows unconditionally**: Always check the right column before setting a value (e.g. check `row.code`, `row.type`, `row.charclass`).
6. **Missing `*eol: 0`** in cube recipe rows: Missing this causes crashes or the game to ignore the recipe.
7. **Setting numeric types on `row` directly**: `row.maxstack = 100` (number) vs `row.maxstack = '100'` (string). While D2RMM coerces, be explicit.

---

## Full Annotated Example: Adding a Simple Toggle Mod

This creates a mod that lets users choose whether all skills can be used in town.

**`mod.json`:**
```json
{
  "$schema": "../config-schema.json",
  "name": "Town Skills",
  "description": "Allow skills to be cast in town.",
  "author": "YourName",
  "version": "1.0",
  "config": [
    {
      "id": "allSkills",
      "type": "checkbox",
      "name": "All Skills",
      "description": "If enabled, all non-passive skills work in town. If disabled, only movement and buff skills are unlocked.",
      "defaultValue": false
    }
  ]
}
```

**`mod.js`:**
```javascript
// Whitelist for when allSkills = false
const ALLOWED_SKILLS = ['Teleport', 'Battle Orders', 'Battle Command', 'Shout',
                         'Leap', 'Charge', 'Hurricane', 'Armageddon', 'Thunder Storm'];

['global\\excel\\skills.txt', 'global\\excel\\base\\skills.txt'].forEach((fileName) => {
  const skills = D2RMM.readTsv(fileName);
  if (!skills) return;

  skills.rows.forEach((row) => {
    // Skip: no class (generic), passive skills
    if (row.charclass === '' || row.passive === '1') return;

    if (config.allSkills || ALLOWED_SKILLS.indexOf(row.skill) !== -1) {
      row.InTown = '1';
    }
  });

  D2RMM.writeTsv(fileName, skills);
});
```
