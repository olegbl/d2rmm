# D2RMM Localization Architecture

D2RMM supports the same 13 languages that Diablo II: Resurrected supports in-game.

---

## Supported Languages

| BCP 47 | D2R code | Language              | Display Name       |
| ------ | -------- | --------------------- | ------------------ |
| en-US  | enUS     | English (US)          | English (US)       |
| de-DE  | deDE     | German                | Deutsch            |
| fr-FR  | frFR     | French                | Français           |
| es-ES  | esES     | Spanish (Spain)       | Español (España)   |
| es-MX  | esMX     | Spanish (Mexico)      | Español (México)   |
| it-IT  | itIT     | Italian               | Italiano           |
| pl-PL  | plPL     | Polish                | Polski             |
| pt-BR  | ptBR     | Portuguese (Brazil)   | Português (Brasil) |
| ru-RU  | ruRU     | Russian               | Русский            |
| ko-KR  | koKR     | Korean                | 한국어             |
| zh-TW  | zhTW     | Chinese (Traditional) | 繁體中文           |
| zh-CN  | zhCN     | Chinese (Simplified)  | 简体中文           |
| ja-JP  | jaJP     | Japanese              | 日本語             |

BCP 47 codes are used internally (matches Electron/browser conventions). Display names are always shown in their native language so users can find their language regardless of the current UI language.

---

## Library

**`i18next`** (core) + **`react-i18next`** (renderer bindings).

- `i18next` works in Node.js (main + worker) and in the browser (renderer) with the same API
- Built-in `{{variable}}` interpolation and automatic pluralization via `_one`/`_other` key suffixes
- `react-i18next` provides the `useTranslation()` hook; calling `i18n.changeLanguage()` automatically triggers React re-renders

---

## Architecture Overview

Three distinct processes each maintain their own i18next instance (module state cannot cross process boundaries).

**Startup** — locale flows from main outward before any process is ready for IPC:

```
┌──────────────────────────────────────────────────────┐
│ Main Process                                          │
│   reads d2rmm-locale.json synchronously               │
└───────┬──────────────────────────┬───────────────────┘
        │ additionalArguments       │ process.env.LOCALE
        │ --locale=<value>          │ (fork env var)
        ▼                           ▼
┌───────────────────────┐  ┌───────────────────────────┐
│ Renderer              │  │ Worker Thread              │
│   preload reads argv  │  │   reads process.env.LOCALE │
│   → window.env.locale │  │   → initI18n()             │
│   → initI18n()        │  └───────────────────────────┘
└───────────────────────┘
```

**Runtime locale change** — user selects a new language in Settings:

```
Renderer
  i18n.changeLanguage(newLocale)   ← UI updates immediately
  LocaleAPI.setLocale(newLocale)   ── IPC ──▶  Main
                                               updates i18next
                                               writes d2rmm-locale.json
                                               LocaleAPI.setLocale(newLocale)  ── IPC ──▶  Worker
                                                                                            updates i18next
```

---

## Locale Storage

### `d2rmm-locale.json`

Stored in Electron's `userData` directory. Written by the main process when the user changes locale. Read synchronously at startup before any async work, so that even early log messages are localized.

```json
{ "locale": "de-DE" }
```

### Locale Fallback Chain

```
1. d2rmm-locale.json (saved preference)
2. navigator.language (system default)
3. "en-US"
```

### Worker Receives Locale

`Workers.ts` passes the current locale as an env var when forking:

```typescript
const workerEnv = { ...process.env, LOCALE: LocaleAPI.getLocale() };
fork(workerPath, [], { env: workerEnv });
```

---

## Locale Files

All 13 locale JSON files live in `src/locales/`:

```
src/locales/
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

All 13 files are statically imported and bundled by webpack into each process bundle.

### Key Naming Convention

Dot-notation, feature-first, snake_case leaves:

```json
{
  "tabs.mods": "Mods",
  "tabs.settings": "Settings",

  "modlist.noMods": "No Mods Found",
  "modlist.action.delete": "Delete",

  "settings.general.gamePath.label": "Game Path",
  "settings.general.gamePath.placeholder": "Path to Diablo II: Resurrected",

  "install.button.install": "Install Mods",
  "install.success": "Installed {{count}} mod",
  "install.success_other": "Installed {{count}} mods",

  "common.ok": "OK",
  "common.cancel": "Cancel"
}
```

### Interpolation and Plurals

```typescript
t('install.success', { count: 5 });
// → "Installed 5 mods"  (uses install.success_other)

t('modlist.delete.dialog.question', { name: 'MyMod' });
// → 'Are you sure you want to delete "MyMod"?'
```

Plurals are automatic: pass `count` and define both `key` and `key_other` (and `key_one` for irregular languages).

---

## How the Renderer Receives Its Initial Locale

The renderer process cannot read the filesystem directly, so the initial locale is injected by the main process before the renderer starts. This avoids an async round-trip and ensures i18next is initialized with the correct locale before React renders.

### Step-by-step

1. **Main process reads locale** (`src/main/i18n.ts` → `getInitialLocale()`):

   - Synchronously reads `d2rmm-locale.json` via `fs.readFileSync`
   - Falls back to `navigator.language`, then `"en-US"`

2. **Main injects locale as a Chromium command-line argument** (`src/main/main.ts`):

   ```typescript
   mainWindow = new BrowserWindow({
     webPreferences: {
       preload: path.join(__dirname, 'preload.js'),
       contextIsolation: true,
       additionalArguments: [`--locale=${getInitialLocale()}`],
     },
   });
   ```

   `additionalArguments` appends extra entries to `process.argv` inside the renderer/preload processes.

3. **Preload script extracts the value and exposes it** (`src/main/preload.js`):

   ```javascript
   contextBridge.exposeInMainWorld('env', {
     platform: process.platform,
     locale:
       process.argv.find((a) => a.startsWith('--locale='))?.split('=')?.[1] ??
       null,
   });
   ```

   `contextBridge.exposeInMainWorld` makes `window.env` available in the renderer while preserving context isolation (the renderer cannot access Node.js APIs directly).

4. **TypeScript type for `window.env`** (`src/types/global.d.ts`):

   ```typescript
   declare global {
     interface Window {
       env: {
         platform: string;
         locale: string | null;
       };
     }
   }
   ```

5. **Renderer reads `window.env.locale`** (`src/renderer/i18n.ts`):
   ```typescript
   const locale =
     window.env.locale ?? // injected by main via additionalArguments
     navigator.language ?? // system default
     'en-US'; // hard fallback
   ```

### Why `additionalArguments` instead of IPC

i18next must be initialized before React renders — there is no "not yet initialized" state. Using IPC would require an async round-trip, forcing either a loading screen or a render with the wrong locale followed by a re-render. Embedding the locale in `additionalArguments` makes it synchronously available in the preload script with zero latency.

### Live locale changes

When the user switches language at runtime, the renderer calls `i18n.changeLanguage(newLocale)` directly — no page reload needed. `react-i18next` automatically triggers re-renders. The `window.env.locale` value reflects only the startup locale; runtime locale is managed entirely by i18next.

---

## Per-Process i18n Modules

### Renderer — `src/renderer/i18n.ts`

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enUS from 'locales/en-US.json';
// ... all 13 locales

export async function initI18n(): Promise<void> {
  const locale = window.env.locale ?? navigator.language ?? 'en-US';
  await i18n.use(initReactI18next).init({
    lng: locale,
    fallbackLng: 'en-US',
    resources: { 'en-US': { translation: enUS }, /* ... */ },
    interpolation: { escapeValue: false }, // React handles XSS
  });
}

// te(): translates an error — uses I18nError key if present, falls back to String(error)
export function te(error: unknown): string { ... }
export default i18n;
```

Called from `src/renderer/index.tsx` before React renders. Components use `useTranslation()`.

### Main Process — `src/main/i18n.ts`

```typescript
export async function initI18n(): Promise<void> {
  const locale = getSavedLocale() ?? navigator.language ?? 'en-US';
  await i18n.init({ lng: locale, fallbackLng: 'en-US', resources: { ... } });
}
export function getLocaleConfigPath(): string { ... }
export default i18n;
```

### Worker — `src/main/worker/i18n.ts`

```typescript
export async function initI18n(): Promise<void> {
  const locale = process.env.LOCALE ?? navigator.language ?? 'en-US';
  await i18n.init({ lng: locale, fallbackLng: 'en-US', resources: { ... } });
}
export default i18n;
```

---

## LocaleAPI (IPC)

**Bridge type**: `src/bridge/LocaleAPI.d.ts`

```typescript
export type ILocaleAPI = {
  getLocale(): string;
  setLocale(locale: string): Promise<void>;
};
```

### Flow when user changes locale in Settings

1. Renderer calls `i18n.changeLanguage(newLocale)` → React re-renders immediately
2. Renderer calls `LocaleAPI.setLocale(newLocale)` via IPC
3. Main process receives the call, updates its own i18next, and writes `d2rmm-locale.json`
4. Worker receives the call via its LocaleAPI handler and updates its own i18next

### Per-Process LocaleAPI

Each process has its own `LocaleAPI.ts`:

| File                           | Role                                                           |
| ------------------------------ | -------------------------------------------------------------- |
| `src/renderer/LocaleAPI.ts`    | `provideAPI` (serves IPC from main); `consumeAPI` (calls main) |
| `src/main/LocaleAPI.ts`        | `provideAPI` (serves IPC from renderer); writes config file    |
| `src/main/worker/LocaleAPI.ts` | `provideAPI` (serves IPC from main); updates worker i18next    |

---

## Localized Console Logs

### The Problem

Log messages flow from worker → main → renderer. Main writes them to `d2rmm.log` on disk. The Logs tab in the renderer displays them. These must be localized differently:

- **`d2rmm.log`**: always English (so bug reports are developer-readable)
- **Logs tab**: user's current locale

### Solution: `I18nArg` Marker

`src/shared/i18n-log.ts` defines an `I18nArg` type — a plain serializable object that passes through the IPC bridge invisibly within the existing `ConsoleArg` type.

```typescript
export type I18nArg = {
  __d2rmm_i18n: true;
  key: string;
  args?: Record<string, string | number>;
};

// Helper used at all call sites:
export function tl(
  key: string,
  args?: Record<string, string | number>,
): I18nArg;
```

**Usage** (worker or main):

```typescript
import { tl } from 'shared/i18n-log';

console.log(tl('install.success', { count: 3 }));
console.error(tl('worker.mod.compileError'), error.stack);
```

The `tl()` return value is passed as a console argument (not the message string itself). Extra context (stack traces, error details) follows as additional arguments and passes through unchanged to both the file and the Logs tab.

### Main Process Handling (`src/main/ConsoleAPI.ts`)

`toFileArgs()` resolves all `I18nArg` markers to English strings before writing to `d2rmm.log`. The raw args (with `I18nArg` intact) are forwarded to the renderer.

```typescript
function toFileArgs(args: ConsoleArg[]): ConsoleArg[] {
  const tEn = i18n.getFixedT('en-US');
  return args.map((a) => (isI18nArg(a) ? tEn(a.key, a.args) : a));
}
```

### Renderer Handling

The renderer's ConsoleAPI detects `I18nArg` markers and translates them to the user's locale for display in the Logs tab.

### `console.debug()` — no localization needed

Debug messages are developer-facing (IPC tracing, init sequences). They are filtered out of the Logs tab by default. They do not use `tl()`.

---

## Localized Errors

### `I18nError` — structured errors across IPC

`src/shared/i18n-log.ts` also defines `I18nError`: an `Error` subclass that carries a translation key so the renderer can display a localized message while the English `error.message` is written to the log file.

```typescript
export type I18nError = Error & {
  i18nKey: string;
  i18nArgs?: Record<string, string | number>;
};

// Factory:
export function createI18nError(
  message: string, // English — written to d2rmm.log
  i18nKey: string,
  i18nArgs?: Record<string, string | number>,
): I18nError;
```

**Usage** (worker):

```typescript
throw createI18nError(
  `Mod "${name}" not found`, // English for d2rmm.log
  'errors.modNotFound',
  { name },
);
```

**Rendering** (renderer hooks):

```typescript
import { te } from 'renderer/i18n';

catch (error) {
  showToast(te(error)); // translates I18nError; falls back to String(error)
}
```

`te()` (translate-error) is exported from `src/renderer/i18n.ts`.

---

## Wrapping Complex JSX Elements in Translated Strings

When a translated string must wrap a React element (e.g. a `<Link>`, `<strong>`, clickable text), use the `\x00` null-byte split pattern.

### Pattern

Put a `\x00` placeholder in the translation string where the React element should appear. Call `t()` with the placeholder value, then split on `\x00` to get the before/after text segments, and render the element between them.

**Locale file (`en-US.json`)**:

```json
{
  "settings.general.outputPath.info": "Output files are written to {{path}}. You can open this folder from Explorer."
}
```

**Component** (`ModManagerSettings.tsx`):

```tsx
<Typography>
  {t('settings.general.outputPath.info', { path: '\x00' }).split('\x00')[0]}
  <Link href="#" onClick={() => ShellAPI.showItemInFolder(outputPath)}>
    {outputPath}
  </Link>
  {t('settings.general.outputPath.info', { path: '\x00' }).split('\x00')[1]}
</Typography>
```

### How it works

1. `t(key, { path: '\x00' })` produces the full translated string with `\x00` in place of `{{path}}`
2. `.split('\x00')` yields `[before, after]` — the text segments surrounding the element
3. The React element is rendered between the two text segments

### When to use

- Any translation key where a clickable link, bold text, or other JSX element appears inline within a sentence
- The `\x00` character is safe because it never appears in translated text naturally

### Caveat

Call `t()` twice (once for `[0]`, once for `[1]`), or call it once and store the result. Both approaches are fine. The key must use `{{path}}` (or another interpolation name) as the placeholder in the locale files — the placeholder name does not need to be `path`.

---

## Settings UI: Language Selector

The Settings tab (`ModManagerSettings.tsx`) includes a language dropdown. Display names are always shown in their native language — users must be able to find their own language even if the UI is currently in the wrong language.

```tsx
import { LOCALE_DISPLAY_NAMES } from 'renderer/i18n';
import { useTranslation } from 'react-i18next';

const { t, i18n } = useTranslation();
const [locale, setLocale] = useSavedState<string>('locale', 'en-US');

const handleChange = async (newLocale: string) => {
  setLocale(newLocale);
  await i18n.changeLanguage(newLocale);
  await LocaleAPI.setLocale(newLocale);
};
```

---

## Key Decisions

| Decision                            | Rationale                                                                     |
| ----------------------------------- | ----------------------------------------------------------------------------- |
| i18next over alternatives           | Battle-tested, excellent TS support, works in Node.js + browser with same API |
| `d2rmm-locale.json` for persistence | Synchronously readable at main boot before async IPC is available             |
| `process.env.LOCALE` for worker     | Locale available before worker IPC is established                             |
| Static JSON imports                 | Simple, type-safe; all locale data bundled by webpack                         |
| Renderer-first                      | 95%+ of user-visible strings are in the React UI                              |
| English always in `d2rmm.log`       | Bug reports from non-English users remain readable by developers              |
| `\x00` split for JSX wrapping       | Avoids `Trans` component complexity; simple and explicit                      |
| `console.debug()` stays English     | Dev-only tracing; filtered from Logs tab by default                           |
| Native display names in dropdown    | Users must find their language even if UI is in wrong language                |
| BCP 47 locale codes                 | Matches Electron/browser standards; maps cleanly to D2R codes                 |
