# D2RMM Mod API Reference

The source of truth is [src/bridge/ModAPI.d.ts](../src/bridge/ModAPI.d.ts) and [src/bridge/ModConfig.d.ts](../src/bridge/ModConfig.d.ts).
Human-facing mod author documentation (with examples): https://olegbl.github.io/d2rmm/

---

## Mod File Types: JavaScript vs TypeScript

D2RMM supports two mod entry points:

| File     | Language                            | Multi-file?                             |
| -------- | ----------------------------------- | --------------------------------------- |
| `mod.js` | Plain JavaScript (ES2020)           | No                                      |
| `mod.ts` | TypeScript with ES6 imports/exports | Yes — split across multiple `.ts` files |

D2RMM processes `mod.ts` by:

1. Recursively resolving all `import` statements
2. Transpiling each file with `ts.transpileModule()` (target: ES5, module: CommonJS)
3. Injecting a lightweight custom `require()` system
4. Executing the result in QuickJS

**TypeScript type checking is not enforced at runtime** — type errors are silently ignored. Types are only for IDE assistance.

### Multi-file TypeScript example

```typescript
// mod.ts
import { formatRuneName } from './utils/format';
const runes = D2RMM.readJson('local\\lng\\strings\\item-runes.json');
runes.forEach(entry => {
  if (entry.Key?.match(/^r[0-9]{2}$/)) {
    for (const lang in entry) {
      if (lang !== 'id' && lang !== 'Key') entry[lang] = formatRuneName(entry);
    }
  }
});
D2RMM.writeJson('local\\lng\\strings\\item-runes.json', runes);

// utils/format.ts
export function formatRuneName(entry: Record<string, string>): string {
  return entry.enUS + ' (' + entry.Key.replace(/^r0?/, '') + ')';
}
```

---

## Runtime Environment

Mods run in a **QuickJS** sandbox. This means:

- ✅ ES2020 JavaScript (arrow functions, destructuring, spread, optional chaining, etc.)
- ✅ `console.log()`, `console.error()`, `console.warn()`, `console.debug()`
- ✅ `JSON.parse()`, `JSON.stringify()`, `Math.*`, `Array.*`, `Object.*`, `String.*`
- ✅ `import` / `export` — in `.ts` mods only (transpiled to custom CommonJS before execution)
- ❌ Node.js APIs (`fs`, `path`, `os`, etc.)
- ❌ Browser APIs (`fetch`, `setTimeout`, `DOM`, etc.)
- ❌ `eval()`
- ❌ `import` in `.js` mods — only works in `.ts`

Two globals are always available:

- **`D2RMM`** — the mod API object (all file I/O and utility methods)
- **`config`** — the user's current config values, typed as defined in `mod.json`

---

## D2RMM Global API

### Version & Info

#### `D2RMM.getVersion(): number`

Returns D2RMM version as a float (e.g. `1.9`). Use to guard against using features not yet available.

```javascript
if (D2RMM.getVersion() < 1.7) {
  throw new Error('This mod requires D2RMM v1.7 or later.');
}
```

#### `D2RMM.getFullVersion(): [number, number, number]`

Returns `[major, minor, patch]`.

```javascript
const [major, minor, patch] = D2RMM.getFullVersion();
```

#### `D2RMM.getModList(): ModEntry[]`

Returns list of all mods in the install order, including whether each is already installed (useful for detecting mod conflicts or dependencies).

```javascript
const modList = D2RMM.getModList();
const hasExpandedStash = modList.some(
  (m) => m.id === 'ExpandedStash' && m.installed,
);
```

Each entry: `{ id: string, name: string, version: string, installed: boolean, config: object }`

---

### TSV File API

TSV files are the core game data tables (`.txt` files with tab-separated columns). They use a `{ headers: string[], rows: object[] }` structure where all values are strings.

#### `D2RMM.readTsv(filePath, options?): TSVData`

Reads a TSV file. Returns `{ headers: string[], rows: { [column: string]: string }[] }`.

Options:

- `removeCarriageReturns: boolean` — strips `\r` from all column names and values, so the last column can be accessed without a trailing `\r`. Prefer this to avoid bugs.

```javascript
const misc = D2RMM.readTsv('global\\excel\\misc.txt', {
  removeCarriageReturns: true,
});
console.log(misc.headers); // ['name', 'compactsave', 'version', ...]
console.log(misc.rows[0]); // { name: 'Gold', compactsave: '1', ... }
```

#### `D2RMM.writeTsv(filePath, data, options?): void`

Writes a TSV file back. The `data` should be the same object returned by `readTsv` (with modifications applied).

Options:

- `addCarriageReturns: boolean` — restore `\r\n` line endings. Use this when you passed `removeCarriageReturns: true` to `readTsv`.

```javascript
D2RMM.writeTsv('global\\excel\\misc.txt', misc, { addCarriageReturns: true });
```

**Important TSV rules:**

- All row values are **strings**. Set them as strings: `row.maxstack = String(config.stackSize)` or just `row.maxstack = config.stackSize` (D2RMM coerces for you, but be explicit).
- Skip blank/separator rows: `if (row['Treasure Class'] === '') return;` or similar.
- Never modify `headers` — only modify `rows`.

---

### JSON File API

JSON files are UI layouts, asset manifests, and localization strings. D2R JSON is non-standard — it allows comments and duplicate keys.

#### `D2RMM.readJson(filePath): JSONData`

Reads a D2R JSON file. Returns the parsed value (object, array, primitive).

```javascript
const profileHD = D2RMM.readJson('global\\ui\\layouts\\_profilehd.json');
const itemRunes = D2RMM.readJson('local\\lng\\strings\\item-runes.json');
// item-runes.json is an array of { Key, enUS, deDE, ... } objects
```

#### `D2RMM.writeJson(filePath, data): void`

Writes a JSON file.

```javascript
D2RMM.writeJson('local\\lng\\strings\\item-runes.json', itemRunes);
```

---

### Text File API

For plain text files (`.txt` that aren't TSV, or `.webm` filenames touched for uninstall tracking).

#### `D2RMM.readTxt(filePath): string`

Reads the file as a raw string.

```javascript
const raw = D2RMM.readTxt('local\\next_string_id.txt');
const id = parseInt(raw.match(/[0-9]+/)[0], 10);
```

#### `D2RMM.writeTxt(filePath, data): void`

Writes the file as a raw string.

```javascript
D2RMM.writeTxt('local\\next_string_id.txt', String(nextId));
```

---

### Save File API (v1.7+)

For reading/writing D2 character `.d2s` and stash `.d2i` binary files.

#### `D2RMM.readSaveFile(filePath): number[] | null`

Reads a save file as an array of byte values. Returns `null` if not found.

#### `D2RMM.writeSaveFile(filePath, data: number[]): void`

Writes binary data to a save file. **Always back up before writing.**

---

### Asset Copy API

#### `D2RMM.copyFile(src, dst, overwrite?): void`

Copies a file or directory from the **mod folder** to the **output data directory**.

- `src` — path relative to the mod's directory
- `dst` — path relative to the game data output directory
- `overwrite` — whether to overwrite conflicts (default: false)

```javascript
// Copy mod's hd\ folder to output hd\ folder
D2RMM.copyFile('hd', 'hd', true);
```

**Anti-pattern**: Do NOT use `copyFile` for TSV/JSON game data. Use `read*`/`write*` instead so other mods can also modify the same files. `copyFile` is for graphics, videos, audio, and other non-mergeable assets.

**Uninstall tracking trick**: Call `D2RMM.readTxt('path/to/asset')` before `copyFile` on the same path. This registers the file with D2RMM's uninstall system so it's cleaned up when the mod is disabled in direct mode.

---

### String ID API

#### `D2RMM.getNextStringID(): number`

Reads `local\next_string_id.txt` and increments the counter. Use when adding new strings that need a unique numeric ID in localization files.

```javascript
const newID = D2RMM.getNextStringID(); // e.g. 21700
```

---

### Error API

#### `D2RMM.error(message): void`

**Deprecated.** Use `throw new Error('message')` or `console.error()` instead. Shows an error in the D2RMM UI and stops mod execution.

---

## mod.json Structure

Every mod must have a `mod.json` in its folder. Supported fields:

```json
{
  "$schema": "../config-schema.json",
  "name": "Display Name",
  "description": "Short description shown in D2RMM",
  "author": "AuthorName",
  "website": "https://www.nexusmods.com/...",
  "version": "1.0",
  "config": [
    /* config fields — see below */
  ]
}
```

`$schema` is optional but enables IDE validation against D2RMM's config schema.

---

## Config Field Types

All config fields share these base properties:

```json
{
  "id": "uniqueId",          // used as config.uniqueId in mod.js
  "type": "...",             // see below
  "name": "Display Label",
  "description": "Tooltip",  // optional
  "visible": <Binding>       // optional — controls visibility dynamically
}
```

### `"type": "checkbox"` — Boolean toggle

```json
{
  "id": "enabled",
  "type": "checkbox",
  "name": "Enable Feature",
  "defaultValue": true,
  "overrideValue": null // optional Binding to lock the value
}
```

In mod.js: `config.enabled` is `true` or `false`.

### `"type": "number"` — Numeric input

```json
{
  "id": "stackSize",
  "type": "number",
  "name": "Max Stack Size",
  "defaultValue": 100,
  "minValue": 1, // optional
  "maxValue": 512 // optional
}
```

In mod.js: `config.stackSize` is a number.

### `"type": "text"` — Text input

```json
{
  "id": "prefix",
  "type": "text",
  "name": "Item Prefix",
  "defaultValue": "★ "
}
```

In mod.js: `config.prefix` is a string.

### `"type": "select"` — Dropdown

```json
{
  "id": "mode",
  "type": "select",
  "name": "Drop Mode",
  "defaultValue": "normal",
  "options": [
    {
      "label": "Normal",
      "value": "normal",
      "description": "Vanilla drop rates"
    },
    { "label": "Increased", "value": "increased" },
    { "label": "Double", "value": "double" }
  ]
}
```

In mod.js: `config.mode` is `"normal"`, `"increased"`, or `"double"`.

### `"type": "color"` — RGBA color picker

```json
{
  "id": "runeColor",
  "type": "color",
  "name": "Rune Name Color",
  "defaultValue": [255, 165, 0, 1.0], // [R, G, B, A] — A is 0.0–1.0
  "isAlphaHidden": true // optional — hide alpha slider
}
```

In mod.js: `config.runeColor` is `[R, G, B, A]`.

### `"type": "section"` — Collapsible group

```json
{
  "id": "advancedSection",
  "type": "section",
  "name": "Advanced Options",
  "description": "Only change these if you know what you're doing.",
  "defaultExpanded": false,
  "defaultValue": null, // set to true/false to add a section-level checkbox
  "allowToggleAll": true, // show "toggle all" if all children are checkboxes
  "children": [
    /* nested fields */
  ]
}
```

**D2RMM UI rendering notes (confirmed from live UI):**
- `description` renders as a tooltip on a **"?" icon** next to the section name — it is NOT shown inline. This applies to all field types, not just sections.
- `defaultExpanded: true` on a section with no items/children shows an empty expanded area. Use `defaultExpanded: false` for info-only sections (no controls under them) to avoid the empty space.
- `visible` bindings work on section headers the same as on individual fields — you can hide/show an entire section header based on another field's value.
- Sections in `mod.json` can be used either as flat headers (items following the section are visually grouped under it until the next section) or with explicit `children` nesting.

**Preset select + custom number pattern** (for user-friendly numeric config):

Use a `select` with named presets plus a `number` field that only appears when "Custom" is chosen. This avoids exposing raw numbers to users who don't understand the underlying scale.

```json
{
  "id": "qualityPreset",
  "type": "select",
  "name": "Quality Chance",
  "defaultValue": "10",
  "options": [
    { "label": "Vanilla (1%)", "value": "1", "description": "Original game rates." },
    { "label": "2x (2%)", "value": "2" },
    { "label": "10x (10%)", "value": "10" },
    { "label": "Custom", "value": "custom", "description": "Enter a value below." }
  ]
},
{
  "id": "quality",
  "type": "number",
  "name": "Custom Quality Chance (%)",
  "defaultValue": 10,
  "minValue": 0,
  "maxValue": 100,
  "visible": ["eq", ["value", "qualityPreset"], "custom"]
}
```

In `mod.js`, resolve the preset to its actual value:

```javascript
function getPresetValue(preset, custom) {
  return preset === 'custom' ? custom : parseFloat(preset);
}
const chance = getPresetValue(config.qualityPreset, config.quality);
```

**Conditional override pattern** (force a field's value based on another field):

```json
{
  "id": "dependentField",
  "type": "checkbox",
  "defaultValue": true,
  "overrideValue": ["if", ["not", ["value", "parentField"]], false, null]
}
```

When `parentField` is false, `dependentField` is forced to false. When `parentField` is true, `overrideValue` evaluates to `null` (no override — user controls it freely). Always also guard the same logic in `mod.js` as a safety net, since `overrideValue` only affects the UI.

---

## Binding Expressions

`visible`, `overrideValue`, and `allowToggleAll` accept **Binding expressions** — JSON arrays that evaluate dynamically based on other config values.

| Expression                        | Result                      | Example                                     |
| --------------------------------- | --------------------------- | ------------------------------------------- |
| `true` / `false` / `42` / `"str"` | Literal value               | `"visible": true`                           |
| `["value", "fieldId"]`            | Current value of field      | `["value", "enabled"]`                      |
| `["expanded", "sectionId"]`       | Whether section is expanded | `["expanded", "advancedSection"]`           |
| `["not", <bool>]`                 | Logical NOT                 | `["not", ["value", "enabled"]]`             |
| `["and", <bool>, <bool>, ...]`    | Logical AND                 | `["and", ["value", "a"], ["value", "b"]]`   |
| `["or", <bool>, <bool>, ...]`     | Logical OR                  | `["or", ["value", "a"], ["value", "b"]]`    |
| `["eq", <T>, <T>]`                | Equality                    | `["eq", ["value", "mode"], "custom"]`       |
| `["neq", <T>, <T>]`               | Inequality                  | `["neq", ["value", "mode"], "off"]`         |
| `["lt", <num>, <num>]`            | Less than                   | `["lt", ["value", "count"], 10]`            |
| `["lte", <num>, <num>]`           | Less than or equal          |                                             |
| `["gt", <num>, <num>]`            | Greater than                |                                             |
| `["gte", <num>, <num>]`           | Greater than or equal       |                                             |
| `["in", <T>, <T[]>]`              | Value in array              | `["in", ["value", "type"], ["a", "b"]]`     |
| `["if", <bool>, <T>, <T>]`        | Ternary                     | `["if", ["value", "enabled"], "on", "off"]` |

**Example — show a custom color picker only when "Custom" is selected:**

```json
[
  {
    "id": "colorPreset",
    "type": "select",
    "name": "Color",
    "defaultValue": "gold",
    "options": [
      { "label": "Gold", "value": "gold" },
      { "label": "Custom", "value": "custom" }
    ]
  },
  {
    "id": "customColor",
    "type": "color",
    "name": "Custom Color",
    "defaultValue": [255, 200, 0, 1.0],
    "visible": ["eq", ["value", "colorPreset"], "custom"]
  }
]
```

---

## D2R Text Color Codes

Used in localization strings (item-names.json, item-runes.json, etc.) to color text in-game.

The `ÿ` character is Unicode U+00FF. In JS: `'\u00ff'` or a literal `ÿ`.

To use a code dynamically in JS:

```js
const color = '\u00ffc';
const colored = `${color}${code}${text}`;
```

Example: `item[key] = 'ÿc4' + item[key];` — makes the name gold-colored.

### Colors (Current)

| Game Code | English Color Name | Hex Color Code |
| --------- | ------------------ | -------------- |
| ÿc;       | Purple             | #74199c        |
| ÿc:       | DarkGreen          | #216319        |
| ÿc?       | Yellow             | #abaf5d        |
| ÿc@       | Orange             | #a07527        |
| ÿc<       | MediumGreen        | #358c25        |
| ÿc=       | White              | #a2bd9f        |
| ÿc>       | Gold               | #9b8d64        |
| ÿc0       | White              | #ffffff        |
| ÿc1       | LightRed           | #ac4041        |
| ÿc2       | BrightGreen        | #4bb034        |
| ÿc3       | Blue               | #5653a8        |
| ÿc4       | Gold               | #99926d        |
| ÿc5       | Gray               | #5e5e5e        |
| ÿc6       | Black              | #000000        |
| ÿc7       | Gold               | #9e9b6f        |
| ÿc8       | Orange             | #a77b2a        |
| ÿc9       | Yellow             | #afb05d        |
| ÿcA       | DarkGreen          | #216218        |
| ÿcB       | Blue               | #4e509d        |
| ÿcC       | BrightGreen        | #48a431        |
| ÿcD       | Gold               | #999166        |
| ÿcE       | White              | #ffffff        |
| ÿcF       | White              | #ffffff        |
| ÿcG       | White              | #ffffff        |
| ÿcH       | White              | #ffffff        |
| ÿcI       | LightTeal          | #71a69a        |
| ÿcJ       | Orange             | #a57928        |
| ÿcK       | Gray               | #b7a293        |
| ÿcL       | Orange             | #a57826        |
| ÿcM       | Purple             | #69379c        |
| ÿcN       | Gold               | #ada47a        |
| ÿcO       | BrightCyan         | #2f7795        |
| ÿcP       | Pink               | #ab64a7        |
| ÿcQ       | LightBlue          | #8a86b8        |
| ÿcR       | BrightGreen        | #48a832        |
| ÿcS       | Yellow             | #adb169        |
| ÿcT       | DarkRed            | #8b3133        |
| ÿcU       | LightCyan          | #6d8fad        |
| ÿcV       | BrightRed          | #9e1e13        |

Screenshot collection: https://imgur.com/a/6SiXKtT

## Colors (Old, Before RotW Expansion)

| Game Code | English Color Name | Hex Color Code |
| --------- | ------------------ | -------------- |
| ÿc;       | Purple             | #9d01da        |
| ÿc:       |                    | #017c01        |
| ÿc?       |                    | unknown        |
| ÿc@       |                    | #d09102        |
| ÿc<       |                    | #00b300        |
| ÿc=       |                    | #ffffff        |
| ÿc>       |                    | unknown        |
| ÿc0       | White              | #ffffff        |
| ÿc1       | LightRed           | #dd4f4f        |
| ÿc2       | BrightGreen        | #02da02        |
| ÿc3       | Blue               | #6968d3        |
| ÿc4       | Gold               | #bfae7a        |
| ÿc5       | Gray               | #5e5e5e        |
| ÿc6       | Black              | #000000        |
| ÿc7       |                    | #c8bc81        |
| ÿc8       | Orange             | #cf9102        |
| ÿc9       | Yellow             | #dfdf64        |
| ÿcA       | DarkGreen          | #017d01        |
| ÿcB       |                    | #6d6de1        |
| ÿcC       |                    | #02d801        |
| ÿcD       |                    | #c1b07b        |
| ÿcE       |                    | #2e1f10        |
| ÿcF       | White              | #ffffff        |
| ÿcG       | White              | #ffffff        |
| ÿcH       | White              | #ffffff        |
| ÿcI       | LightTeal          | #78c2b4        |
| ÿcJ       |                    | #d99801        |
| ÿcK       | BrightTeal         | #02daac        |
| ÿcL       |                    | #da9801        |
| ÿcM       |                    | #d9c68a        |
| ÿcN       | BrightCyan         | #0b98c3        |
| ÿcO       | Pink               | #e47ee4        |
| ÿcP       | LightBlue          | #a8a8ef        |
| ÿcQ       |                    | #02db01        |
| ÿcR       | White              | #e1e173        |
| ÿcS       |                    | #bd4444        |
| ÿcT       | LightCyan          | #80b7e5        |
| ÿcU       | BrightRed          | #db0101        |
| ÿcV       |                    | unknown        |

Screenshot collection: https://imgur.com/a/lrqE6J1

---

## Localization JSON Structure

Files in `local\lng\strings\` are arrays of objects, one per string key:

```json
[
  {
    "id": 12345,
    "Key": "ItemName",
    "enUS": "English text",
    "deDE": "German text",
    "esES": "Spanish text",
    "frFR": "French text",
    "itIT": "Italian text",
    "jaJP": "Japanese text",
    "koKR": "Korean text",
    "plPL": "Polish text",
    "ptBR": "Portuguese text",
    "ruRU": "Russian text",
    "zhCN": "Simplified Chinese",
    "zhTW": "Traditional Chinese"
  }
]
```

When modifying all localizations (e.g. adding a prefix to all rune names):

```javascript
for (const key in item) {
  if (key !== 'id' && key !== 'Key') {
    item[key] = prefix + item[key];
  }
}
```
