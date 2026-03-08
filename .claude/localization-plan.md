# D2RMM Localization Plan

## Goal

Add full UI localization to D2RMM, supporting the same 13 languages that D2R supports in-game. This covers D2RMM's own UI only — mod configs and mod-generated strings are out of scope for now.

---

## D2R Language Codes

| D2R code | BCP 47 | Language              |
| -------- | ------ | --------------------- |
| enUS     | en-US  | English (US)          |
| deDE     | de-DE  | German                |
| frFR     | fr-FR  | French                |
| esES     | es-ES  | Spanish (Spain)       |
| esMX     | es-MX  | Spanish (Mexico)      |
| itIT     | it-IT  | Italian               |
| plPL     | pl-PL  | Polish                |
| ptBR     | pt-BR  | Portuguese (Brazil)   |
| ruRU     | ru-RU  | Russian               |
| koKR     | ko-KR  | Korean                |
| zhTW     | zh-TW  | Chinese (Traditional) |
| zhCN     | zh-CN  | Chinese (Simplified)  |
| jaJP     | ja-JP  | Japanese              |

We use BCP 47 internally (matches Electron/browser conventions). The D2R code mapping is kept for documentation.

---

## Library Choice

**`i18next`** (core) + **`react-i18next`** (renderer bindings).

Reasons:

- Industry standard, excellent TypeScript support
- Built-in printf-style interpolation: `"Installed {{count}} mods"`
- Pluralization: `_one` / `_other` key suffixes (no code changes needed)
- Namespace support for organizing strings
- Lazy loading support (future: split locale files per-feature)
- Works in Node.js (main + worker) and browser (renderer) with same API

Install:

```bash
# in release/app/
yarn add i18next react-i18next
```

---

## Architecture Overview

Three processes each need their own i18next instance. They cannot share module state across process boundaries.

```
┌─────────────────────────────────────────────────────┐
│ Renderer                                             │
│   react-i18next + i18next                            │
│   Locale source: localStorage (useSavedState)        │
│   Can switch locale live (React re-renders)          │
└──────────────┬──────────────────────────────────────┘
               │ IPC: locale-change event (EventAPI)
┌──────────────┴──────────────────────────────────────┐
│ Main Process                                         │
│   i18next (Node.js)                                  │
│   Locale source: locale config file (sync read)      │
│   Re-init i18next on locale-change event from worker │
└──────────────┬──────────────────────────────────────┘
               │ fork() env var: LOCALE=de-DE
┌──────────────┴──────────────────────────────────────┐
│ Worker                                               │
│   i18next (Node.js)                                  │
│   Locale source: process.env.LOCALE (from fork)     │
│   Re-init on LocaleAPI.setLocale() IPC call          │
└─────────────────────────────────────────────────────┘
```

---

## Locale Storage Strategy

The locale setting must be readable by **main process at startup**, before IPC is established, so that even early log messages can be localized.

### Config File

Write a small `d2rmm-locale.json` in the same directory as user preferences:

```json
{ "locale": "de-DE" }
```

- **Written by**: renderer (via `BridgeAPI.writeLocaleConfig()` or direct file write) when user changes locale
- **Read by**: main process synchronously at startup (after `app.ready`), right inside `initPreferences()`
- **Read by**: worker via `process.env.LOCALE` (main passes it when calling `fork()`)

### localStorage (renderer)

Renderer also stores locale in localStorage under key `locale` via `useSavedState`. On first launch (no file), falls back to `app.getLocale()` → nearest supported locale.

### Fallback Chain

```
1. Config file (d2rmm-locale.json)
2. app.getLocale() mapped to nearest D2RMM-supported locale
3. "en-US"
```

---

## Locale File Structure

```
src/
└── locales/
    ├── en-US.json    ← primary; ALL keys must exist here
    ├── de-DE.json
    ├── fr-FR.json
    ├── es-ES.json
    ├── es-MX.json
    ├── it-IT.json
    ├── pl-PL.json
    ├── pt-BR.json
    ├── ru-RU.json
    ├── ko-KR.json
    ├── zh-TW.json
    ├── zh-CN.json
    └── ja-JP.json
```

These are bundled into all three processes via webpack's asset handling.

### Key Naming Convention

Dot-notation, noun-first, snake_case leaves:

```json
{
  "app.title": "D2RMM — Diablo II: Resurrected Mod Manager",

  "tabs.mods": "Mods",
  "tabs.saves": "Saves",
  "tabs.settings": "Settings",
  "tabs.logs": "Logs",

  "modlist.dropZone": "Drop .zip to install mod",
  "modlist.noMods": "No mods installed",

  "install.button.install": "Install Mods",
  "install.button.installing": "Installing...",
  "install.success": "Installed {{count}} mod",
  "install.success_other": "Installed {{count}} mods",
  "install.error": "Failed to install mod \"{{name}}\": {{error}}",

  "settings.gamePath.label": "Game Path",
  "settings.gamePath.placeholder": "Path to Diablo II: Resurrected folder",
  "settings.language.label": "Language",

  "errors.modNotFound": "Mod \"{{name}}\" not found",
  "errors.pathNotSafe": "Path is outside allowed directory",

  "common.ok": "OK",
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.delete": "Delete",
  "common.confirm": "Confirm"
}
```

### Printf-Style Formatting

Use i18next's built-in `{{variable}}` interpolation:

```typescript
t('install.success', { count: 5 });
// → "Installed 5 mods"

t('install.error', { name: 'MyMod', error: 'File not found' });
// → "Failed to install mod \"MyMod\": File not found"
```

Plurals are automatic when `count` is passed and `_one`/`_other` variants exist.

---

## Per-Process Implementation

### Renderer (`src/renderer/i18n.ts`)

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import all locale files (bundled by webpack)
import enUS from '../locales/en-US.json';
import deDE from '../locales/de-DE.json';
// ... etc

export const SUPPORTED_LOCALES = ['en-US', 'de-DE', ...] as const;
export type Locale = typeof SUPPORTED_LOCALES[number];

export async function initI18n(locale: Locale): Promise<void> {
  await i18n
    .use(initReactI18next)
    .init({
      lng: locale,
      fallbackLng: 'en-US',
      resources: {
        'en-US': { translation: enUS },
        'de-DE': { translation: deDE },
        // ...
      },
      interpolation: { escapeValue: false }, // React handles XSS
    });
}

export async function changeLocale(locale: Locale): Promise<void> {
  await i18n.changeLanguage(locale);
}
```

- Init happens at React bootstrap, before rendering
- `useTranslation()` hook used in components
- `i18n.changeLanguage()` triggers re-render automatically via react-i18next
- Locale persisted to localStorage via `useSavedState('locale', defaultLocale)`

### Main Process (`src/main/i18n.ts`)

```typescript
import i18n from 'i18next';
import enUS from '../../locales/en-US.json';
// ...

export async function initI18n(locale: string): Promise<void> {
  await i18n.init({
    lng: locale,
    fallbackLng: 'en-US',
    resources: { 'en-US': { translation: enUS }, ... },
  });
}

// Usage: i18n.t('some.key', { var: value })
```

Called from `main.ts` after `initPreferences()` (which determines the locale file path).

### Worker (`src/main/worker/i18n.ts`)

Same as main, but locale comes from `process.env.LOCALE`:

```typescript
export async function initI18n(): Promise<void> {
  const locale = process.env.LOCALE ?? 'en-US';
  await i18n.init({ lng: locale, ... });
}
```

Called as the **first step** in `worker.ts` start() (before `initIPC()` even, since locale affects all subsequent log messages).

---

## IPC: Locale Changes at Runtime

When the user changes locale in Settings:

1. Renderer updates localStorage via `useSavedState`
2. Renderer calls `i18n.changeLanguage(newLocale)` → UI updates immediately
3. Renderer calls `BridgeAPI.setLocale(newLocale)` (new IPC call)
4. Worker re-initializes i18next with new locale
5. Worker writes `d2rmm-locale.json` to disk
6. Main process receives locale-change event (worker→main via IPC) and re-initializes its i18next

### New Bridge API: `LocaleAPI`

`src/bridge/LocaleAPI.d.ts`:

```typescript
export type ILocaleAPI = {
  setLocale(locale: string): Promise<void>;
  getLocale(): Promise<string>;
};
```

Implemented in `src/main/worker/LocaleAPI.ts`, initialized in `worker.ts` early (but after `initIPC`).

### Worker Spawning with Locale

In `Workers.ts`, pass locale as env var:

```typescript
const locale = readLocaleConfigSync() ?? app.getLocale();
fork(workerPath, [], {
  env: { ...process.env, LOCALE: locale },
});
```

---

## Localized Logs: Logs Tab vs. d2rmm.log File

**Decision**: The Logs tab (in-app) should display messages in the user's locale. The `d2rmm.log` file on disk must always be in English so that bug reports are readable by developers.

### Console Pipeline (how it actually works)

```
Worker console.log(msg)
  → localConsole[level](msg)        [worker stdout — dev only]
  → ConsoleAPI[level](msg) via IPC  [broadcast to main AND renderer]

Main receives (provideAPI 'ConsoleAPI'):
  → localConsole[level](msg)        [electron-log → d2rmm.log on disk]

Renderer receives (provideAPI 'ConsoleAPI'):
  → localConsole[level](msg)        [browser devtools console]
  → LISTENERS.forEach(...)          [→ LogContext → Logs tab]
```

Main's own `console.log()` also goes through this: electron-log writes to file AND broadcasts to renderer via ConsoleAPI IPC.

### I18nArg: The Dual-Language Solution

Add an optional structured `I18nArg` marker that can be appended to any `console.log()` call alongside the English string. Each process handles it differently:

- **Main** (file path): strips `I18nArg` from args, writes only the English string to disk
- **Renderer** (display path): detects `I18nArg`, translates it, shows localized text in Logs tab

```typescript
// src/shared/i18n-log.ts
export type I18nArg = {
  __d2rmm_i18n: true;
  key: string;
  args?: Record<string, string | number>;
  english: string; // pre-formatted English fallback
};

export function isI18nArg(arg: unknown): arg is I18nArg {
  return (
    typeof arg === 'object' &&
    arg !== null &&
    '__d2rmm_i18n' in arg &&
    (arg as I18nArg).__d2rmm_i18n === true
  );
}

// Helper used in worker/main to create a localizable log arg:
export function i18nArg(
  key: string,
  args: Record<string, string | number>,
  english: string,
): I18nArg {
  return { __d2rmm_i18n: true, key, args, english };
}
```

`I18nArg` fits within the existing `{ [key: string]: ConsoleArg }` type so it passes through the IPC bridge without bridge changes.

### Usage at Call Site

```typescript
// In worker or main:
import { i18nArg } from 'shared/i18n-log';

// English always first; I18nArg is an optional second argument
console.log(
  `Installed ${count} mods`,
  i18nArg('install.success', { count }, `Installed ${count} mods`),
);
```

### Main Process ConsoleAPI Changes

In `src/main/ConsoleAPI.ts`, filter `I18nArg` from file writes:

```typescript
// Main's own console (writes to file):
consoleWrapper[level] = (...args) => {
  const fileArgs = args.filter((a) => !isI18nArg(a));
  localConsole[level](...fileArgs); // electron-log → d2rmm.log (English only)
  ConsoleAPI[level](...args); // broadcast with I18nArg intact
};

// Receiving from worker:
provideAPI(
  'ConsoleAPI',
  {
    log: async (...args) => {
      const fileArgs = args.filter((a) => !isI18nArg(a));
      localConsole.log(...fileArgs); // file: English only
      // (renderer receives directly via broadcast — not re-forwarded from here)
    },
  },
  true,
);
```

### Renderer ConsoleAPI Changes

In `src/renderer/ConsoleAPI.ts`, translate `I18nArg` for display:

```typescript
function resolveDisplayArgs(args: ConsoleArg[], t: TFunction): ConsoleArg[] {
  const i18n = args.find(isI18nArg);
  if (i18n == null) return args;
  // Replace all args with the single translated string
  return [t(i18n.key, i18n.args ?? {})];
}

// Both the local console wrapper and the provideAPI handler use resolveDisplayArgs:
log: async (...args) => {
  const displayArgs = resolveDisplayArgs(args, t);
  localConsole.log(...displayArgs);
  LISTENERS.forEach((l) => l('log', displayArgs));
},
```

The `t` function here comes from a module-level i18next instance (not a React hook), accessible from `src/renderer/i18n.ts`.

### Developer Debug Logs

`console.debug()` messages are developer-facing (worker init sequences, IPC tracing, etc.) and do **not** need `I18nArg`. They stay in English in both file and Logs tab. The Logs tab already filters debug messages out by default.

---

## Handling Worker/Main Error Strings

Error messages thrown in worker bubble up through IPC to renderer as plain strings. These may appear as toast notifications or in the Logs tab.

### Approach: Structured Errors (Phase 2)

Replace raw `throw new Error("Some message with {{var}}")` in worker with structured errors:

```typescript
// Worker throws:
throw Object.assign(new Error(`Mod "${name}" not found`), {
  i18nKey: 'errors.modNotFound',
  i18nArgs: { name },
});
```

Renderer catches via hook and re-translates:

```typescript
catch (error) {
  const msg = error.i18nKey
    ? t(error.i18nKey, error.i18nArgs)
    : error.message;
  showToast(msg);
}
```

The `error.message` (English) is what gets written to `d2rmm.log` when the error is logged. The renderer re-translates from the key for display.

For Phase 1, worker can use English strings only — the `i18nKey` pattern is added in Phase 2 as a targeted improvement for the most user-visible errors.

### Installation Status Messages

Worker sends status updates via `EventAPI` (fire-and-forget events). These flow: worker → main → renderer.

These should use the `I18nArg` approach in the console, OR if they're typed events (not console messages), define a structured `IInstallStatus` type:

```typescript
// In bridge/InstallStatus.d.ts (Phase 3):
type IInstallStatus = {
  key: string;
  args?: Record<string, string | number>;
  english: string; // for logging
};
```

**Recommendation**: Use `I18nArg`-tagged `console.log` for installation progress messages (they naturally flow to Logs tab already). Define structured `IInstallStatus` for the progress bar/status area display only.

---

## Settings UI: Language Selector

Add to `ModManagerSettings.tsx` (Settings tab):

```tsx
import { SUPPORTED_LOCALES, Locale } from 'renderer/i18n';
import { useTranslation } from 'react-i18next';

function LanguageSettings() {
  const { t, i18n } = useTranslation();
  const [locale, setLocale] = useSavedState<Locale>('locale', 'en-US');

  const handleChange = useCallback(async (newLocale: Locale) => {
    setLocale(newLocale);
    await i18n.changeLanguage(newLocale);
    await BridgeAPI.setLocale(newLocale); // IPC to worker
  }, []);

  return (
    <TextField
      label={t('settings.language.label')}
      select
      value={locale}
      onChange={(e) => handleChange(e.target.value as Locale)}
    >
      {SUPPORTED_LOCALES.map((l) => (
        <MenuItem key={l} value={l}>
          {LOCALE_DISPLAY_NAMES[l]}
        </MenuItem>
      ))}
    </TextField>
  );
}
```

Native display names (e.g., "Deutsch", "Français") shown in the dropdown, not translated — users need to find their own language.

---

## Webpack / Build Considerations

### Bundling Locale JSON Files

Locale JSON files need to be available in all three webpack bundles (main, worker, renderer). Since they're `import`ed statically, webpack will inline them as JS modules automatically.

Alternative: use `extraResources` in electron-builder to ship them as files, and load them at runtime. This enables translators to patch locale files without rebuilding. **Recommended for Phase 2.**

For Phase 1, static imports are simpler.

### Path Aliases

The `locales/` directory needs a webpack alias:

```typescript
// In webpack configs:
'locales': path.join(srcPath, 'locales'),
```

And a `tsconfig.json` path:

```json
"paths": {
  "locales/*": ["src/locales/*"]
}
```

---

## Implementation Phases

### Phase 1: Renderer Localization (Core UI)

**Scope**: All text visible in the React UI.

1. Install `i18next` and `react-i18next` (in `release/app/package.json`)
2. Create `src/locales/en-US.json` with all renderer strings
3. Create `src/renderer/i18n.ts` with i18next setup
4. Update `src/renderer/index.tsx` to call `initI18n()` before rendering
5. Add `LocaleContextProvider` to `App.tsx` context stack (provides current locale, exposes setter)
6. Extract strings from all renderer components (see "String Audit" below)
7. Add language selector to Settings tab
8. Add `src/bridge/LocaleAPI.d.ts` + `src/main/worker/LocaleAPI.ts` (just `setLocale` writing the config file, no worker re-init yet)

### Phase 2: Worker Error Localization

9. Add `i18next` to worker (`src/main/worker/i18n.ts`)
10. Pass `LOCALE` env var in `Workers.ts` `fork()` call
11. Re-init worker i18next via `LocaleAPI.setLocale()` IPC
12. Convert user-visible worker errors to key-based (`i18nKey` + `i18nArgs`)
13. Update renderer toast/error handlers to re-translate structured errors

### Phase 3: Installation Status Messages

14. Define structured `IInstallStatus` type (key + args, not human string)
15. Replace string status messages in `BridgeAPI.ts` with structured type
16. Renderer translates status messages via i18next

### Phase 4: Main Process Localization

17. Add `i18next` to main process (`src/main/i18n.ts`)
18. Read locale from `d2rmm-locale.json` in `initPreferences()`
19. Pass locale to main's i18next; use `t()` for window title and any user-visible main strings

### Phase 5: Translation Files

20. Create placeholder locale files for all 13 languages (empty strings acceptable)
21. Document contribution process for translators
22. Consider Crowdin integration for managed translation workflow

---

## String Audit (Renderer)

Key files requiring string extraction (renderer only):

| File                                 | Approximate string count | Notes                                       |
| ------------------------------------ | ------------------------ | ------------------------------------------- |
| `App.tsx`                            | 3                        | Tab labels, drop zone text                  |
| `ModManagerSettings.tsx`             | ~40                      | Settings labels, descriptions, placeholders |
| `ModList.tsx`                        | ~10                      | Empty state, section labels                 |
| `modlist/ModListMenu.tsx`            | ~15                      | Context menu items                          |
| `modlist/ModInstallButton.tsx`       | ~5                       | Button labels, states                       |
| `modlist/RunGameButton.tsx`          | ~5                       | Button labels                               |
| `modlist/CreateCollectionDialog.tsx` | ~20                      | Dialog labels, form fields                  |
| `InstallationProgressBar.tsx`        | ~5                       | Progress labels                             |
| `AppUpdaterDialog.tsx`               | ~10                      | Update dialog                               |
| `ErrorBoundary.tsx`                  | ~5                       | Error messages                              |
| `ed2r/` (save editor)                | ~30                      | Save editor UI                              |
| Context hooks (toast messages)       | ~30                      | Error/success toasts                        |

**Total estimate**: ~180–220 user-visible strings in renderer.

---

## Key Decisions & Rationale

| Decision                                      | Rationale                                                                                                       |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| i18next over alternatives                     | Battle-tested, excellent TS, works in Node+browser, printf built-in                                             |
| File-based locale config (not electron-store) | Synchronously readable at main boot without async/await or app.ready wait                                       |
| `process.env.LOCALE` for worker               | Locale available before IPC is established                                                                      |
| Static JSON imports (Phase 1)                 | Simple, type-safe; runtime file loading is a Phase 2 optimization                                               |
| Renderer-first (Phase 1)                      | 95% of user-visible strings are in renderer; highest ROI                                                        |
| Key-based errors in worker                    | Avoids coupling worker locale init to renderer locale; clean separation                                         |
| BCP 47 locale codes                           | Matches Electron/browser standards; maps cleanly to D2R codes                                                   |
| Native display names in dropdown              | Users must be able to find their language even if UI is in wrong language                                       |
| `I18nArg` marker in console args              | Lets main strip to English for file writes; renderer translates for Logs tab display; no new IPC channel needed |
| English always in `d2rmm.log`                 | Bug reports submitted by non-English users remain readable by developers                                        |
| `console.debug()` stays English               | Dev-only tracing logs; not shown to users by default; no localization overhead                                  |

---

## Open Questions

1. **Auto-detect locale**: Should we map `app.getLocale()` to the nearest D2RMM-supported locale on first launch? (e.g., `en-AU` → `en-US`, `zh` → `zh-CN`). Probably yes.

2. **Mod config labels**: Mod configs have `label` and `description` fields in `mod.json` — these are defined by mod authors, not D2RMM. Should D2RMM support a `label_de-DE` convention in mod.json for mod author translations? Explicitly out of scope for now, but worth considering.

3. **Log messages**: RESOLVED — Logs tab shows localized text; `d2rmm.log` file always English. Implemented via `I18nArg` marker (see "Localized Logs" section). Developer `console.debug()` stays English everywhere.

4. **RTL languages**: D2R doesn't include any RTL languages, so no RTL layout support needed.

5. **Font support**: CJK languages (Chinese, Japanese, Korean) require fonts that render those characters. MUI uses system fonts by default — this should work on systems where these languages are installed, but verify on Windows with English locale (may need font fallback config in MUI theme).