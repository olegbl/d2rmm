# D2R Game File Reference

All paths are relative to D2R's `data\` directory. Mods read/write them with paths like `'global\\excel\\misc.txt'`.

## See Also

**[.claude/d2r-game-mechanics.md](.claude/d2r-game-mechanics.md)** — How the game systems _work_: full item drop pipeline, TC chaining, NoDrop multiplayer scaling formula, quality roll math, Magic Find diminishing returns, affix level calculation. Read this before writing any drop-rate or loot mod.

---

## Researching Files

When you need detailed column documentation beyond what's here:

- **D2R-specific guide** (most accurate): https://locbones.github.io/D2R_DataGuide/
- **Classic D2 knowledge base** (mostly applies): https://d2mods.info/forum/kb/
  - Browse articles at https://d2mods.info/forum/kb/ — example: https://d2mods.info/forum/kb/viewarticle?a=284
- **Item generation tutorial** (TC traversal, NoDrop, quality rolls): https://www.purediablo.com/forums/threads/item-generation-tutorial.110/

Many column names and mechanics are identical between D2 classic and D2R, with D2R adding new columns.

## The Base File Rule

**Always modify both the regular and `base\` variant of every Excel TSV file:**

```javascript
['global\\excel\\misc.txt', 'global\\excel\\base\\misc.txt'].forEach(
  (fileName) => {
    const data = D2RMM.readTsv(fileName);
    if (!data) return;
    // ... modify ...
    D2RMM.writeTsv(fileName, data);
  },
);
```

The `base\` variants are used by the game for characters in the Classic/LoD realm (not the RotW realm). Missing them causes inconsistent behavior.

---

## Excel (TSV) Files — Game Data Tables

### `global\excel\misc.txt`

Miscellaneous items: gems, potions, scrolls, tomes, keys, quest items, gold.

Key columns:
| Column | Description |
|--------|-------------|
| `name` | String key for item name |
| `code` | 3-letter item code (e.g. `tbk`=Town Portal Tome, `ibk`=ID Tome, `key`=Key, `aqv`=Arrows, `cqv`=Bolts) |
| `type` | Item type code (references `itemtypes.txt`) |
| `stackable` | `1` if item can stack |
| `maxstack` | Maximum stack size |
| `minstack` | Minimum stack when dropped |
| `spawnstack` | Stack size when spawned by game |
| `ShowLevel` | `1` to show ilvl in item name |

Common item codes: `gld`=gold, `hp1-hp5`=health potions, `mp1-mp5`=mana potions, `rvs`/`rvl`=rejuv potions, `tsc`/`isc`=scrolls, `tpk`=thawing, `amu`=amulet, `rin`=ring, `jew`=jewel, `cm1-cm3`=charms.

**Gem and skull item codes** — 5 qualities × 7 types (source: `src/renderer/react/ed2r/ED2R.tsx`):

|          | Diamond | Emerald | Ruby  | Topaz | Amethyst | Sapphire | Skull |
| -------- | ------- | ------- | ----- | ----- | -------- | -------- | ----- |
| Chipped  | `gcw`   | `gcg`   | `gcr` | `gcy` | `gcv`    | `gcb`    | `skc` |
| Flawed   | `gfw`   | `gfg`   | `gfr` | `gfy` | `gfv`    | `gfb`    | `skf` |
| Regular  | `gsw`   | `gsg`   | `gsr` | `gsy` | `gsv`    | `gsb`    | `sku` |
| Flawless | `glw`   | `glg`   | `glr` | `gly` | `gzv`    | `glb`    | `skl` |
| Perfect  | `gpw`   | `gpg`   | `gpr` | `gpy` | `gpv`    | `gpb`    | `skz` |

Notes:

- Flawless Amethyst uses `gzv` (not `glv`) because `glv` is taken by the Glaive weapon.
- Regular-quality Diamond/Emerald/Ruby/Sapphire (`gsw`, `gsg`, `gsr`, `gsb`) are in **`item-nameaffixes.json`**, not `item-names.json`. All other gem/skull keys are in `item-names.json`.

---

### `global\excel\weapons.txt`

All weapons: swords, axes, maces, spears, bows, wands, staves, etc.

Key columns:
| Column | Description |
|--------|-------------|
| `name` | String key |
| `code` | 3-letter code |
| `type` | Item type code |
| `stackable` | `1` if stackable (throwing weapons, javelins) |
| `minstack` / `maxstack` / `spawnstack` | Stack sizes |
| `type` | Item type (e.g. `tpot`=throwing potion — don't modify these) |
| `ShowLevel` | Show item level |
| `mindam` / `maxdam` | Min/max 1H damage |
| `2handmindam` / `2handmaxdam` | 2H damage |
| `speed` | Attack speed modifier |
| `reqstr` / `reqdex` | Strength/dex requirements |

---

### `global\excel\armor.txt`

All armor: helms, chest, gloves, boots, belts, shields.

Key columns:
| Column | Description |
|--------|-------------|
| `name` / `code` | Name key / item code |
| `type` | Item type |
| `minac` / `maxac` | Min/max armor class |
| `block` | Block chance (shields) |
| `ShowLevel` | Show item level |
| `reqstr` | Strength requirement |
| `durability` | Base durability |

---

### `global\excel\skills.txt`

All skills for all character classes.

Key columns:
| Column | Description |
|--------|-------------|
| `skill` | Skill name (string, e.g. `'Teleport'`) |
| `charclass` | Class code: `ama`, `sor`, `nec`, `pal`, `bar`, `dru`, `ass`. Empty = all |
| `passive` | `1` if passive (passive skills can't be set as InTown) |
| `InTown` | `1` to allow use in town |
| `anim` | Animation to use |
| `range` | Range type: `'none'`, `'ranged'`, `'melee'` |
| `minrange` / `maxrange` | Min/max range |

To allow a skill in town: `row.InTown = 1;` (filter to only non-passive skills with a charclass).

---

### `global\excel\runes.txt`

Runeword definitions.

Key columns:
| Column | Description |
|--------|-------------|
| `Name` | Runeword name string key |
| `Rune Name` | Internal reference name |
| `complete` | `1` if runeword is functional |
| `server` | `1` if ladder-only (clear to `''` for SP access) |
| `firstLadderSeason` | First ladder season (D2R 2.6+; clear for SP) |
| `lastLadderSeason` | Last ladder season (D2R 2.6+; clear for SP) |
| `itype1-itype6` | Item types the runeword works in |
| `etype1-etype3` | Item types it's excluded from |
| `Rune1-Rune6` | Required runes in order (misc.txt codes) |
| `T1Code1-T1Code7` | Property codes (from properties.txt) |
| `T1Param1-T1Param7` | Property parameters |
| `T1Min1-T1Min7` / `T1Max1-T1Max7` | Property value ranges |
| `*eol` | Must be `0` to prevent crashes |

To enable all runewords in singleplayer: clear `server`, `firstLadderSeason`, `lastLadderSeason`.

---

### `global\excel\treasureclassex.txt`

Drop tables — controls what items monsters drop.

Key columns:
| Column | Description |
|--------|-------------|
| `Treasure Class` | TC name (referenced by monster files) |
| `group` | TC group (for alternates) |
| `level` | TC level for auto-TC picks |
| `Picks` | Number of items picked from this TC |
| `Unique` | Divisor for unique chance (lower = more uniques) |
| `Sets` | Divisor for set chance |
| `Rares` | Divisor for rare chance |
| `Magic` | Divisor for magic chance |
| `NoDrop` | Weight of "no drop" entry |
| `Item1-Item10` | Child TCs or item codes |
| `Prob1-Prob10` | Probability weights for each item |

To simulate `/players N` effect, reduce `NoDrop` using the formula:
`NoDrop_new = Math.floor(NoDrop / (1 + (N - 1) * NoDrop / (NoDrop + totalWeight)))`

---

### `global\excel\itemratio.txt`

Controls the ratio/chance of different item quality levels dropping.

Key columns:
| Column | Description |
|--------|-------------|
| `Version` | Game version (usually leave as-is) |
| `Unique` | Base chance to roll unique (lower = more common) |
| `UniqueDivisor` | Divisor for unique chance |
| `UniqueMin` | Minimum unique chance |
| `Set`, `SetDivisor`, `SetMin` | Same for sets |
| `Rare`, `RareDivisor`, `RareMin` | Same for rares |
| `Magic`, `MagicDivisor`, `MagicMin` | Same for magic |
| `HiQuality`, `HiQualityDivisor` | High quality normal items |

---

### `global\excel\cubemain.txt`

Horadric Cube recipes.

Key columns:
| Column | Description |
|--------|-------------|
| `description` | Comment field — name your recipe here |
| `enabled` | `1` to enable, `0` to disable |
| `ladder` | `1` for ladder-only |
| `min diff` | Min difficulty (0=all, 1=NM+Hell, 2=Hell only) |
| `version` | `0`=classic, `100`=expansion |
| `op` / `param` / `value` | Requirement check (optional) |
| `class` | Class restriction (e.g. `sor`, `nec`) |
| `numinputs` | Number of input items required |
| `input 1` - `input 7` | Input item codes/types + qualifiers |
| `output` | Output item (code, `usetype`, `useitem`, etc.) |
| `lvl` / `plvl` / `ilvl` | Base/player/item level of output |
| `mod 1` - `mod 5` | Property codes added to output |
| `mod 1 min` - `mod 5 min` | Property min values |
| `mod 1 max` - `mod 5 max` | Property max values |
| `mod 1 chance` - `mod 5 chance` | Percent chance to apply property |
| `*eol` | Must be `0` |

Input item syntax examples:

- `'hax'` — specific item code (Hand Axe)
- `'weap'` — item type code
- `'weap,sock'` — with socket
- `'weap,nos'` — without socket
- `'weap,eth'` — ethereal
- `'weap,low'` — low quality
- `'weap,nor'` — normal quality
- `'weap,mag'` — magic quality
- `'weap,rar'` — rare quality
- `'weap,set'` — set quality
- `'weap,uni'` — unique quality

---

### `global\excel\inventory.txt`

Defines inventory, stash, and cube grid dimensions.

Key columns:
| Column | Description |
|--------|-------------|
| `class` | Container name (e.g. `Player`, `Stash`, `Cube`, `Expansion Stash`) |
| `invWidth` / `invHeight` | Grid dimensions in cells |
| `invLeft` / `invTop` | Grid pixel position in UI |
| `GripX` / `GripY` | Panel grip position |
| `itemWidth` / `itemHeight` | Pixel size per grid cell |
| `invGridX` / `invGridY` | Grid offset within panel |

---

### `global\excel\levels.txt`

World area/level definitions. Also modify `global\excel\base\levels.txt` (LoD/classic realm variant).

Key columns:
| Column | Description |
|--------|-------------|
| `Name` | Level name string key |
| `Id` | Numeric level ID (referenced by `desecratedzones.json` TZ system) |
| `SizeX` / `SizeX(N)` / `SizeX(H)` | Level width in tiles per difficulty |
| `SizeY` / `SizeY(N)` / `SizeY(H)` | Level height in tiles per difficulty |
| `MonDen` / `MonDen(N)` / `MonDen(H)` | Monster pack spawn probability per tile × 100,000; capped at 10,000 by engine |
| `MonUMin` / `MonUMin(N)` / `MonUMin(H)` | Min champion/unique packs (empty = use MonUMax default; ignored if MonDen=0) |
| `MonUMax` / `MonUMax(N)` / `MonUMax(H)` | Max champion/unique packs |
| `mon1-mon25` | Monster types that can randomly spawn |
| `nmon1-nmon25` | Nightmare monster overrides |
| `umon1-umon25` | Unique/champion monster pool |
| `cmon1-cmon4` | Champion monster types |
| `NumMon` | Number of distinct monster types active (out of mon1-mon25) |
| `rangedspawn` | `1` if ranged spawning allowed |

**MonDen mechanics** — see `d2r-game-mechanics.md` "Monster Spawning System" for full details:

- `MonDen / 100,000` = probability per walkable tile; larger maps get proportionally more packs
- Engine clamps at 10,000 (10% per tile) — effective max multiplier ~14× for typical 700-density zones
- MonDen=0 means zero packs spawn AND MonUMin is ignored (champion minimums not honored)
- Several TZ-rotation zones have MonDen=0 in Normal (notably Bloody Foothills, Id=110); fix via a `minDensity` config using `Math.max(value, minDensity)`
- Minimum non-zero vanilla density: **325** (Kurast streets, Travincal)

---

### `global\excel\charstats.txt`

Per-class character base stats and speeds.

Key columns:
| Column | Description |
|--------|-------------|
| `class` | Character class |
| `walkvelocity` | Walking speed |
| `runvelocity` | Running speed |
| `runscalar` | Run speed scalar |
| `str` / `dex` / `vit` / `eng` | Starting stats |
| `LifePerLevel` / `StaminaPerLevel` | Stat gains per level |

---

### `global\excel\monstats.txt`

Monster statistics. Very large file.

Key columns:
| Column | Description |
|--------|-------------|
| `Id` | Monster ID |
| `NameStr` | Name string key |
| `Res` suffixes | Resistances per element per difficulty |
| `Immune` fields | Immunities |
| `Velocity` / `Run` | Movement speeds |
| `minHP` / `maxHP` | HP range |
| `AC` | Armor class |
| `Drain` | Life/mana drain |
| `AI` | AI type |
| `El1Mode-El3Mode` | Elemental attack modes |

To cap resistances: `row.ResFi = Math.min(parseInt(row.ResFi || '0'), maxRes).toString();` etc.

---

### `global\excel\itemstatcost.txt`

Defines every item stat/modifier. Very advanced — consult d2mods.info for details.

Key columns:
| Column | Description |
|--------|-------------|
| `Stat` | Stat name/code |
| `ID` | Numeric ID (referenced by other files) |
| `op` / `op param` / `op base` / `op stat` | Stat operation |
| `descpriority` | Display priority in tooltip |
| `descfunc` | Display function |
| `descval` | Display value modifier |
| `descstrpos` / `descstrneg` | Display string keys |

---

### `global\excel\automagic.txt` / `magicprefix.txt` / `magicsuffix.txt`

Item affix definitions. Used by PerfectDrops mod to control item rolls.

---

## UI Layout Files (JSON)

UI layouts are JSON trees of nested widgets with `name`, `type`, and `children` fields plus positional `fields`.

### `global\ui\layouts\_profilehd.json`

Master style definitions — font colors, UI constants. Almost every UI-touching mod modifies this.

Common properties modified:

- `FontColorRed`, `FontColorBlue`, `FontColorGreen`, etc. — item label colors
- `FontColorGold`, `FontColorWhite`, `FontColorGray` — item rarity colors

### `global\ui\layouts\_profilelv.json`

Low-resolution variant of `_profilehd.json`.

### Panel layout files

Each major UI panel has its own layout file:

- `global\ui\layouts\bankoriginallayouthd.json` — original stash tab
- `global\ui\layouts\bankexpansionlayouthd.json` — expansion stash tabs
- `global\ui\layouts\characterlayouthd.json` — character/inventory panel
- `global\ui\layouts\mainmenupanelhd.json` — main menu
- `global\ui\layouts\characterselectpanelhd.json` — character select
- `global\ui\layouts\controller\*.json` — controller variants of above

### Traversing UI JSON trees

Use recursive helper functions (see `.claude/d2r-mod-examples.md`). Layout files have a deeply nested widget tree — never replace the whole file, only modify specific nodes by name.

---

## Localization Files (JSON)

In `local\lng\strings\`:

| File                    | Contents                                                                                                                                                                                            |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `item-names.json`       | Potion, gem, rune, scroll, tome names — most gem/skull keys live here                                                                                                                               |
| `item-runes.json`       | Runeword names (keys like `r01`, `r02`…)                                                                                                                                                            |
| `item-nameaffixes.json` | Suffix/prefix affix names — **also** holds regular-quality gem names for Diamond/Emerald/Ruby/Sapphire (`gsw`, `gsg`, `gsr`, `gsb`); regular Topaz/Amethyst and all Skulls are in `item-names.json` |
| `item-modifiers.json`   | Stat modifier descriptions                                                                                                                                                                          |
| `item-quality.json`     | Quality names (Superior, Cracked, etc.)                                                                                                                                                             |
| `monsters.json`         | Monster and boss names                                                                                                                                                                              |
| `skills.json`           | Skill names                                                                                                                                                                                         |
| `ui.json`               | UI text strings                                                                                                                                                                                     |

Each file is an array. Each entry has `id`, `Key`, and one key per language (`enUS`, `deDE`, `esES`, `frFR`, `itIT`, `jaJP`, `koKR`, `plPL`, `ptBR`, `ruRU`, `zhCN`, `zhTW`).

---

## Asset Files

### Videos

`hd\global\video\blizzardlogos.webm`, `logoanim.webm` — intro videos. Replace with empty files via `copyFile` to skip them.

### Item graphics

`hd\items\items.json` — maps item codes to asset paths.
`hd\items\misc\gem\*.json` — per-gem visual definition.
`hd\items\misc\rune\*.json` — per-rune visual definition.

### UI graphics

`hd\ui\panel\*.` — panel background images.

When adding custom graphics:

1. Place them in your mod folder under the same relative path
2. `D2RMM.readTxt('hd\\path\\to\\file')` to register for uninstall tracking
3. `D2RMM.copyFile('hd', 'hd', true)` to deploy
