# D2R Game Mechanics Reference

Deeper than the file-column reference in `d2r-game-files.md`. Covers _how_ the game systems
work and how the files interconnect — essential context for writing effective mods.

---

## Item Drop System

When a monster dies, the game runs through a multi-stage pipeline to decide what (if anything)
drops. Six interconnected files control this system.

### The Pipeline at a Glance

```
1. monstats.txt        → which TreasureClass does this monster use?
2. treasureclassex.txt → TC chains (NoDrop, Picks, recursive sub-TCs)
3. treasureclassex.txt → leaf TC → item type + code selected
4. weapons/armor/misc  → specific base item (by ilvl)
5. itemratio.txt       → quality roll (Unique/Set/Rare/Magic/HiQuality/Normal)
6. uniqueitems / setitems / magicprefix / magicsuffix → specific item & affixes
```

---

### Stage 1 — TC Selection (`monstats.txt`)

Each monster has separate TreasureClass columns for different situations:

| Situation | Column |
|-----------|--------|
| Normal monster | `TreasureClass` |
| Champion | `TreasureClassChamp` |
| Unique/Boss | `TreasureClassUnique` |
| Quest kill | `TreasureClassQuest` |
| Desecrated (D2R 2.4+) | `TreasureClassDesecrated` |

Each exists across three difficulties — no suffix = Normal, `(N)` = Nightmare, `(H)` = Hell.
Example: `TreasureClassUnique(H)` is a boss's Hell TC.

**Mod tip**: To change what a monster drops, change its `TreasureClass*` column in `monstats.txt`.

---

### Stage 2 — TC Traversal (`treasureclassex.txt`)

TCs are recursive. Each has up to 10 slots (`Item1`–`Item10`) with probability weights
(`Prob1`–`Prob10`) plus a `NoDrop` weight. The game picks `Picks` times from this weighted
table. Each slot can be:

- An **item code** (leaf) — actual item spawns (e.g. `amu`, `gld`, `r07`)
- A **TC name** — recursed into (e.g. `"Act 2 Cast B"`, `"Bow and Xbow 24"`)

This creates chains like:
```
Andariel(H) → Act 1 (H) Super → Weapons75 → Swords75 → actual sword base type
```

#### TC Groups and Auto-Upgrade

TCs that share the same `group` value form a progression sequence. The game auto-selects
the TC within the group whose `level` is closest to but not exceeding the monster's TC level.
This is how difficulty scaling works automatically — you almost never need per-difficulty TC
assignments for generic item type TCs; the game walks up the group ladder.

#### The `Picks` Column

| Value | Behavior |
|-------|----------|
| Positive `N` | Always pick exactly N times |
| Negative `-N` | Pick up to N times, stopping early if NoDrop is rolled |

---

### Stage 3 — NoDrop Mechanics

`NoDrop` is a weight competing against item weights. When it's selected, nothing drops for
that pick. A `NoDrop` of `0` means the TC always produces an item.

#### Multiplayer Scaling Formula

In multiplayer, `NoDrop` is reduced (more items drop). The exact formula used in
`GuaranteedDrops` mod (and by the game engine internally):

```javascript
// N = effective player count
// For integer players: N = ceil(players / 2)
// For fractional (D2R allows): N = (players + 1) / 2
const N = Math.floor(players) === +players
  ? Math.ceil(players / 2)
  : (players + 1) / 2;

// Stored values in file are × 100 (so "15" in file = 0.15 actual weight)
const NoDrop  = +(row.NoDrop ?? 0) / 100;
const ProbSum = [1,2,3,4,5,6,7,8,9,10]
  .reduce((acc, i) => acc + +(row[`Prob${i}`] ?? 0), 0) / 100;

// NewNoDrop = floor( ProbSum / (1 / (NoDrop/(NoDrop+ProbSum))^N  −  1) ) × 100
row.NoDrop = String(
  Math.floor((ProbSum / (1 / (NoDrop / (NoDrop + ProbSum)) ** N - 1)) * 100)
);
```

To hard-guarantee drops (no nothing), just set `NoDrop = '0'` on every TC.

---

### Stage 4 — Item Type and Base Selection

After TC traversal, a leaf TC is reached with actual item codes. The game:

1. Picks a slot from the weighted table (excluding NoDrop)
2. If the slot is `gld` → spawn gold (amount determined separately)
3. Otherwise → looks up the code in `weapons.txt`, `armor.txt`, or `misc.txt`

For "type TCs" (TCs that contain item type codes rather than specific codes), the game
picks a specific base item from that type based on ilvl — items with higher `level`
requirements cluster at higher ilvls.

---

### Stage 5 — Item Level (ilvl)

```
ilvl = monster level (mlvl)
```

Monster type modifiers:

| Monster Type | ilvl bonus |
|--------------|-----------|
| Normal | +0 |
| Champion | +2 |
| Unique/Boss | +3 |

ilvl controls:
- Which base items can drop (items have `level` and `levelreq` in weapons/armor/misc)
- The quality roll thresholds (compared against `qlvl` from the item's file)
- The affix pool (alvl derived from ilvl, see Stage 6)

---

### Stage 6 — Quality Determination (`itemratio.txt`)

Quality rolls happen in strict order — **first pass wins**:

```
Unique → Set → Rare → Magic → HiQuality → Normal
```

For each quality, the game calculates an effective chance and tests it. A lower value in
`itemratio.txt` means a _better_ drop rate (it's a divisor, not a multiplier).

**Simplified quality formula:**

```
adjusted_chance = max(BaseChance − floor((ilvl − qlvl) / Divisor), Min)
```

Where `BaseChance` = `Unique` column, `Divisor` = `UniqueDivisor`, `Min` = `UniqueMin`.

Magic Find reduces this effective chance further (more MF = lower effective chance = better
quality more often), but with diminishing returns:

| Quality | MF DR Formula | Notes |
|---------|--------------|-------|
| Unique | `MF × 250 / (MF + 250)` | Strong DR |
| Set | `MF × 500 / (MF + 500)` | Moderate DR |
| Rare | `MF × 600 / (MF + 600)` | Moderate DR |
| Magic | `MF` applied directly | No DR |

At 300 MF: effective Unique boost ≈ 136%, Set ≈ 187%, Rare ≈ 200%, Magic = 300%.

After passing a quality roll, the game checks if a valid item of that quality exists:
- **Unique**: scans `uniqueitems.txt` for entries matching item code with `rarity > 0` and
  `qlvl ≤ ilvl`. If none found → silently downgrade to Rare.
- **Set**: scans `setitems.txt` similarly. If none found → downgrade to Rare.
- **Rare**: always possible on eligible item types.

**Common modding patterns:**

```javascript
// Double unique drop rate, disable level scaling
data.rows.forEach((row) => {
  if (row.Function === '') return;
  row.Unique = String(Math.round(+row.Unique / 2));
  row.UniqueDivisor = '1000000000'; // disable ilvl scaling
  row.UniqueMin = '1';              // never go below 1 (prevents 0 = always)
});
```

---

### Stage 7 — Affix Generation (`magicprefix.txt` / `magicsuffix.txt`)

The affix pool is determined by the **Affix Level (alvl)**:

```
if ilvl >= qlvl:
  alvl = qlvl + floor((ilvl − qlvl) / 2)  [capped at 99]
else:
  alvl = ilvl
```

An affix can spawn only if `affix.level ≤ alvl` and `affix.maxlevel ≥ ilvl` (or maxlevel is
blank). Higher ilvl → more affixes eligible → better/higher-tier mods available.

**Prefix/suffix counts by quality:**

| Quality | Prefixes | Suffixes |
|---------|----------|---------|
| Magic | 0 or 1 | 0 or 1 (at least one total) |
| Rare | 2–3 | 2–3 (max 3+3, selected from 6 candidate pairs) |
| Crafted | 1 fixed + 0–2 random | 1 fixed + 0–2 random |

---

### Full Pipeline Example

```
Andariel dies in Hell (mlvl = 75, Unique monster):

  1. monstats.txt → TreasureClassUnique(H) = "Andariel(H)"

  2. treasureclassex.txt "Andariel(H)":
       NoDrop=15, Picks=5
       Item1="Andariel1(H)" Prob1=700
       Item2="Andariel2(H)" Prob2=200
       Item3=gld           Prob3=75
       ...

     5 picks from weighted table (15+700+200+75+...):
       Pick 1 → "Andariel1(H)" → recurse → "Weapons75" → "Swords75" → war sword code
       Pick 2 → NoDrop → nothing
       Pick 3 → gld → gold spawns
       Pick 4 → "Andariel2(H)" → recurse → ring/amulet TC → amulet code
       Pick 5 → "Andariel1(H)" → recurse → armor code

  3. ilvl = 75 + 3 (unique bonus) = 78

  4. Quality roll for war sword:
       qlvl (from weapons.txt) = e.g. 45
       adjusted_chance_unique = Unique − floor((78−45) / UniqueDivisor)
       MF applied with DR → effective unique chance
       Roll: if passes → check uniqueitems.txt for war sword uniques with qlvl ≤ 78
             (e.g. "Lightsabre" has qlvl 71 → eligible)
       If no unique passes or none eligible → try Set → Rare → Magic ...

  5. Affix roll (if e.g. Rare):
       alvl = 45 + floor((78−45)/2) = 45 + 16 = 61
       Pick from prefixes with level ≤ 61, suffixes with level ≤ 61
```

---

### Quick Mod Reference

| Goal | File to modify | What to change |
|------|---------------|----------------|
| More items drop | `treasureclassex.txt` | Reduce `NoDrop` weights (or set to `0`) |
| Simulate `/players N` | `treasureclassex.txt` | Apply NoDrop scaling formula |
| More uniques/sets | `itemratio.txt` | Reduce `Unique`/`Set` values |
| Remove ilvl scaling | `itemratio.txt` | Set `UniqueDivisor` etc. to `1000000000` |
| Change monster TC | `monstats.txt` | Edit `TreasureClass*` columns |
| Add item to drop pool | `treasureclassex.txt` | Add code+weight to a TC |
| Boss-specific drops | `treasureclassex.txt` | Create/modify boss TC directly |
| Rune/gem drop rates | `treasureclassex.txt` | Modify `Rune X`/`Gems` TCs |
| Higher ilvl items | `monstats.txt` | Raise monster `Level` column |
| Better affixes | Implicit — raise ilvl | Higher monster level → higher alvl |

---

## See Also

- `d2r-game-files.md` — column-level reference for all these files
- `d2r-mod-examples.md` — NoDrop pattern code, itemratio patterns
- Real mod implementations (local or https://github.com/olegbl/d2rmm.mods):
  - `GuaranteedDrops` — full NoDrop formula implementation
  - `IncreaseDroprate` — itemratio manipulation
  - `PerfectDrops` — affix manipulation
- External references:
  - https://www.purediablo.com/forums/threads/item-generation-tutorial.110/ — detailed item generation tutorial (TC traversal, NoDrop math, quality rolls, affix selection)
  - https://locbones.github.io/D2R_DataGuide/ — authoritative D2R column docs
  - https://d2mods.info/forum/kb/ — deep-dive on TC system, itemratio math
  - https://olegbl.github.io/d2rmm/ — D2RMM mod author documentation
