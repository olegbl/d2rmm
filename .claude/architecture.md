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

## IPC System (`src/main/IPC.ts`)

### `provideAPI(namespace, api, broadcast?)`
Registers an API handler in the current process. When a request arrives for `namespace`, it calls the matching method.

```typescript
provideAPI('MyAPI', {
  doThing: async (arg: string): Promise<string> => {
    return `result: ${arg}`;
  },
});
```

- `broadcast: true` — fire-and-forget; no response sent back (used for events)

### `consumeAPI<T>(namespace, localAPI?, broadcast?)`
Returns a Proxy that converts method calls into IPC requests and awaits responses.

```typescript
const api = consumeAPI<IMyAPI>('MyAPI');
const result = await api.doThing('hello'); // → IPC round-trip
```

- The type parameter `T` must match the bridge interface in `src/bridge/`
- `localAPI` — optional override methods handled locally (no IPC needed)

### Message Schema (`src/bridge/IPC.d.ts`)
```typescript
// Request:  { id, namespace, api, args[] }
// Success:  { id, result }
// Error:    { id, error: { name, message, stack } }
```

`id` is generated as `"main:0"`, `"renderer:0"` etc. to track pending promises.

### Type Constraints (`src/bridge/API.d.ts`)
All API methods must:
- Accept only `SerializableType` arguments
- Return `Promise<SerializableType>` or `Promise<void>`

`SerializableType` = `null | boolean | number | string | SerializableType[] | { [key: string]: SerializableType }`

**No Buffers in bridge calls.** Binary data is passed as `number[]`.

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
  } satisfies IMyNewAPI);
}
```

3. **Register in worker** — add to `src/main/worker/worker.ts`:
```typescript
import { initMyNewAPI } from './MyNewAPI';
// in start():
await initMyNewAPI();
```

4. **Consume in renderer** — create a hook in `src/renderer/react/context/hooks/`:
```typescript
import { consumeAPI } from 'renderer/IPC'; // renderer-side consumeAPI
import type { IMyNewAPI } from 'bridge/MyNewAPI';

export function useMyNewAPI() {
  const api = useMemo(() => consumeAPI<IMyNewAPI>('MyNewAPI'), []);
  const doSomething = useCallback(async (arg: string) => {
    return api.doSomething(arg);
  }, [api]);
  return { doSomething };
}
```

5. **Use in component** — call `useMyNewAPI()` wherever needed.
