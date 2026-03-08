# D2RMM Architecture Reference

## Process Model

D2RMM runs three processes that communicate via a shared IPC/RPC system:

```
┌──────────────────────────────────────────────┐
│  Renderer Process (BrowserWindow)             │
│  src/renderer/  — React UI, no Node access   │
│  Uses: consumeAPI() to call main/worker       │
└──────────┬───────────────────────────────────┘
           │ Electron IPC (ipcMain/ipcRenderer)
           │ single 'ipc' channel
┌──────────┴───────────────────────────────────┐
│  Main Process                                 │
│  src/main/main.ts — Window lifecycle, routing │
│  Registers: ShellAPI, NxmProtocolAPI,         │
│             EventAPI, ConsoleAPI, AppInfoAPI   │
│  Also: forwards IPC messages to workers       │
└──────────┬───────────────────────────────────┘
           │ child_process IPC (fork)
           │ same message schema as Electron IPC
┌──────────┴───────────────────────────────────┐
│  Worker Thread(s)                             │
│  src/main/worker/  — Heavy lifting, Node I/O  │
│  Registers: BridgeAPI, ModUpdaterAPI,         │
│             UpdaterAPI, + mirrors of above    │
└──────────────────────────────────────────────┘
```

**Key insight**: The Main process acts as a **message bus**. All IPC messages go through it; it forwards renderer messages to workers and worker messages to renderer. This means the renderer can call worker APIs and vice versa using the same `consumeAPI()` / `provideAPI()` interface.

---

## IPC System

**Full reference**: [.claude/ipc-architecture.md](.claude/ipc-architecture.md)

Quick summary:
- `provideAPI(namespace, impl, broadcast?)` — registers a handler in the current process
- `consumeAPI<T>(namespace, localAPI?, broadcast?)` — returns a Proxy that makes IPC calls
- Main forwards all messages between renderer and worker; any thread can call any API
- `broadcast: true` = fire-and-forget (no response); used for ConsoleAPI, EventAPI, LocaleAPI
- All args/returns must be `SerializableType` — no Buffers, class instances, or functions
- Import from `renderer/IPC` in renderer, `./IPC` in main and worker

---

## Worker Thread Initialization (`src/main/worker/worker.ts`)

The worker runs in a `fork()`ed child process. Initialization order matters:

```
initIPC()          → sets up process.on('message') handler
initEventAPI()     → consumes EventAPI from main
initConsoleAPI()   → consumes ConsoleAPI from main
initAppInfoAPI()   → consumes AppInfoAPI from main
initAsar()         → sets up ASAR module paths
initQuickJS()      → loads QuickJS WASM module
initCascLib()      → loads CascLib native binding
initBridgeAPI()    → provides BridgeAPI (core mod operations)
initUpdaterAPI()   → provides UpdaterAPI
initModUpdaterAPI()→ provides ModUpdaterAPI (Nexus)
```

---

## Bridge API Categories

All in `src/bridge/` as `.d.ts` type-only files:

| File | Namespace | Process | Purpose |
|------|-----------|---------|---------|
| `BridgeAPI.d.ts` | `BridgeAPI` | Worker | File I/O, mod installation, CascLib |
| `ModUpdaterAPI.d.ts` | `ModUpdaterAPI` | Worker | Nexus Mods REST + GraphQL |
| `AppInfoAPI.d.ts` | `AppInfoAPI` | Main | App path, version |
| `ConsoleAPI.d.ts` | `ConsoleAPI` | Main | Logging to electron-log |
| `EventAPI.d.ts` | `EventAPI` | Main | Event bus (main→renderer) |
| `ShellAPI.d.ts` | `ShellAPI` | Main | Open URLs/files in shell |
| `NxmProtocolAPI.d.ts` | `NxmProtocolAPI` | Main | nxm:// protocol registration |
| `UpdateInstallerAPI.d.ts` | `UpdateInstallerAPI` | Main | Auto-updater |
| `ElectronUtilsAPI.d.ts` | `ElectronUtilsAPI` | Main | Electron utility calls |
| `RequestAPI.d.ts` | `RequestAPI` | Worker | HTTP requests |
| `RendererIPCAPI.d.ts` | `RendererIPCAPI` | Renderer | Renderer-side IPC setup |

---

## Renderer IPC Setup

In the renderer, `consumeAPI` sends messages via Electron's `contextBridge` / `ipcRenderer`. The preload script (`src/main/preload.js`) exposes a safe `window.electron.ipcRenderer` interface.

```typescript
// src/bridge/RendererIPCBridge.d.ts defines the window.electron shape
// src/bridge/RendererIPCAPI.d.ts defines renderer-side IPC operations
```

The renderer also calls `consumeAPI()` the same way as the main process, but under the hood it uses `ipcRenderer.send/on` instead of `process.send/on`.

---

## EventAPI — Main-to-Renderer Events

For push notifications from main process to renderer (no request/response):

```typescript
// In main process:
const eventAPI = consumeAPI<IEventAPI>('EventAPI');
eventAPI.emitEvent('nexus-mods-open-url', url);

// In renderer (hook):
const eventAPI = consumeAPI<IEventAPI>('EventAPI');
useEffect(() => {
  eventAPI.onEvent('nexus-mods-open-url', handleUrl);
  return () => eventAPI.offEvent('nexus-mods-open-url', handleUrl);
}, []);
```

Current events: `nexus-mods-open-url`, `nexus-mods-open-collection-url`, `nexus-mods-api-state-update`

---

## BridgeAPI — Core Mod Operations

Implemented in `src/main/worker/BridgeAPI.ts` (~1200 lines). Key operations:

```typescript
// Mod installation (the main feature)
installMods(modsToInstall: Mod[], options: IInstallModsOptions): Promise<string[]>

// File operations (all relative to game/output paths, validated for safety)
readFile(filePath, relative): Promise<Buffer | null>
writeFile(inputPath, relative, data): Promise<number>
readJson(filePath, relative): Promise<JSONData>
writeTsv(filePath, relative, data): Promise<TSVData>
// ...etc.

// CascLib (game data extraction from MPQ archives)
openStorage(gamePath): Promise<boolean>
closeStorage(): Promise<boolean>
extractFileToMemory(filePath): Promise<Buffer>
isGameFile(filePath): Promise<boolean>
```

`Relative` enum controls path base: `'game'`, `'output'`, `'merged'`, `'saves'`, `'app'`

---

## Mod Execution (QuickJS)

Mods are JavaScript files executed in a sandboxed QuickJS environment:
- `src/main/worker/quickjs.ts` — QuickJS initialization
- `src/main/worker/BridgeAPI.ts` — injects D2RMM API into sandbox, runs mod code
- Mod code is read via `readModCode(modId)` → returns `[code, sourceMap]`
- Source maps enable proper error stack traces pointing to mod source

Mod API (what mods call) is separate from D2RMM's internal API. See [D2RMM API docs](https://olegbl.github.io/d2rmm/).

---

## Mod State & Config System

Mod data in the renderer lives in `ModsContext` (`src/renderer/react/context/ModsContext.tsx`) as two distinct layers:

### Layer 1 — `modsWithoutOverrides` (disk-sourced)

Loaded at startup (and on explicit refresh) by reading the filesystem via `getMods()`:

```
getMods()
  → BridgeAPI.readModInfo(modID)    → mod.info  (mod.json schema)
  → BridgeAPI.readModConfig(modID)  → mod.config (config.json values, merged with defaults)
  → stored as Mod[] state
```

`mod.config` = `{ ...getDefaultConfig(info.config), ...diskConfigValues }`.

### Layer 2 — `modConfigOverrides` (in-memory / localStorage)

A `Record<string, Partial<ModInfo>>` that overrides **`mod.info` fields** (not config values). Used by `useModInstaller` to patch metadata after a Nexus install (e.g. inject `version` or `website` when the mod's `mod.json` doesn't include them). Persisted to localStorage.

### How to update a mod's config

| Use case | Correct approach | Why |
|----------|-----------------|-----|
| User changes a config option in the UI | `setModConfig(id, newConfig)` from `useSetModConfig()` | Updates disk + in-memory state atomically |
| Install-time config restore (collection) | `setModConfig(id, config)` | Same — ensures UI reflects the write without a manual refresh |
| **Avoid** | `BridgeAPI.writeModConfig(id, config)` directly | Writes disk only; in-memory `mod.config` stays stale until next `refreshMods()` call |

`setModConfig` is defined in `ModsContext` and calls `BridgeAPI.writeModConfig` internally while also patching `modsWithoutOverrides` in place via `setMods(...)`.

### Refreshing mods

```typescript
const [, refreshMods] = useMods();
await refreshMods();          // re-read all mods from disk
await refreshMods([modId]);   // partial refresh — re-read one mod (returns Mod[])
```

`refreshMods` is the correct way to sync the in-memory state after any external change to mod files on disk.

---

## Dialog System

Dialogs use a context-based approach rather than React Router:

```typescript
// DialogContext provides:
showDialog(id: string, dialog: ReactNode): void
hideDialog(id: string): void

// Usage in a component:
const { showDialog, hideDialog } = useDialogContext();
showDialog('my-dialog', <MyDialog onClose={() => hideDialog('my-dialog')} />);

// DialogRenderer (in App.tsx) renders all active dialogs
```

---

## Adding a New Worker API — Step by Step

See [.claude/ipc-architecture.md](.claude/ipc-architecture.md) for the full IPC reference including all patterns (main-only APIs, broadcast APIs, local overrides, renderer-only APIs).

1. **Type definition** — add interface to `src/bridge/MyNewAPI.d.ts`:
```typescript
export type IMyNewAPI = {
  doSomething: (arg: string) => Promise<string>;
};
```

2. **Implementation** — create `src/main/worker/MyNewAPI.ts`:
```typescript
import { provideAPI } from './IPC';
import type { IMyNewAPI } from 'bridge/MyNewAPI';

export async function initMyNewAPI(): Promise<void> {
  provideAPI('MyNewAPI', {
    doSomething: async (arg: string): Promise<string> => {
      // implementation
      return `result: ${arg}`;
    },
  } as IMyNewAPI);
}
```

3. **Register in worker** — add to `src/main/worker/worker.ts`:
```typescript
import { initMyNewAPI } from './MyNewAPI';
// in start():
await initMyNewAPI();
```

4. **Consume in renderer** — create `src/renderer/MyNewAPI.ts`:
```typescript
import type { IMyNewAPI } from 'bridge/MyNewAPI';
import { consumeAPI } from 'renderer/IPC';

const MyNewAPI = consumeAPI<IMyNewAPI>('MyNewAPI');

export default MyNewAPI;
```

Then import it wherever needed (hooks, context, components):
```typescript
import MyNewAPI from 'renderer/MyNewAPI';

export function useMyNewAPI() {
  const doSomething = useCallback(async (arg: string) => {
    return MyNewAPI.doSomething(arg);
  }, []);
  return { doSomething };
}
```

5. **Use in component** — call `useMyNewAPI()` wherever needed.
