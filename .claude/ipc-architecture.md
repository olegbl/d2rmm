# D2RMM IPC Architecture

D2RMM runs three processes. They communicate via a unified request/response system built on top of Electron IPC and Node `child_process` messaging.

---

## Process Topology

```
┌──────────────────────────────────────────────────┐
│  Renderer Process (BrowserWindow)                 │
│  src/renderer/ — React UI, no direct Node access │
│  IPC module: src/renderer/IPC.ts                 │
│  Transport: window.IPCBridge (via preload)        │
└──────────────────┬───────────────────────────────┘
                   │ Electron ipcMain / ipcRenderer
                   │ single 'ipc' channel
┌──────────────────┴───────────────────────────────┐
│  Main Process                                     │
│  src/main/ — window lifecycle, protocol handler  │
│  IPC module: src/main/IPC.ts                     │
│  Acts as MESSAGE BUS — forwards all messages      │
└──────────────────┬───────────────────────────────┘
                   │ child_process fork()
                   │ process.send / process.on('message')
┌──────────────────┴───────────────────────────────┐
│  Worker Thread (child process)                    │
│  src/main/worker/ — heavy I/O, mod install       │
│  IPC module: src/main/worker/IPC.ts              │
└──────────────────────────────────────────────────┘
```

**The Main process is a message bus.** When it receives a message from renderer or worker, it:

1. Checks if it has a registered handler for the namespace — if yes, calls it
2. Forwards the raw message to all other threads regardless

This means any thread can call any API registered in any other thread using the exact same `consumeAPI` / `provideAPI` interface.

---

## Core API: `provideAPI` and `consumeAPI`

Both functions are exported from each thread's local IPC module. Import from the correct module for your thread:

```typescript
// In src/main/worker/*.ts
import { provideAPI, consumeAPI } from './IPC';

// In src/main/*.ts
import { provideAPI, consumeAPI } from './IPC';

// In src/renderer/*.ts and src/renderer/react/**/*.ts
import { provideAPI, consumeAPI } from 'renderer/IPC';
```

**Do not cross-import IPC modules between threads.**

---

### `provideAPI(namespace, impl, broadcast?)`

Registers an implementation in the current process. When any thread sends a request for `namespace`, this handler is called.

```typescript
provideAPI('MyAPI', {
  doThing: async (arg: string): Promise<string> => {
    return `result: ${arg}`;
  },
} as IMyAPI);
```

- `namespace` — string key that identifies the API (must match across all threads)
- `impl` — object whose methods are `async` and accept/return only `SerializableType` values
- `broadcast` — when `true`, no response is sent back (see Broadcast APIs below)

**Type assertion**: use `as IMyAPI` to assert the implementation matches the bridge type. TypeScript cannot fully verify this due to the proxy mechanism, so it is intentional.

---

### `consumeAPI<T>(namespace, localAPI?, broadcast?)`

Returns a `Proxy` object. Calling any method on it sends an IPC request to whichever thread has registered `provideAPI` for that namespace, then awaits and returns the response.

```typescript
const api = consumeAPI<IMyAPI>('MyAPI');
const result = await api.doThing('hello'); // IPC round-trip
```

- `T` — bridge interface from `src/bridge/*.d.ts`
- `localAPI` — optional object with methods to handle locally without IPC (see Local Override Pattern below)
- `broadcast` — when `true`, send the message but resolve immediately without waiting for a response

**`consumeAPI` is called at module scope** (outside any function or hook), not inside React hooks or component render functions. The returned proxy is stable and can be stored in a module-level variable.

---

## Message Schema (`src/bridge/IPC.d.ts`)

All three transports use the same message format:

```typescript
// Request (any thread → any thread)
{ id: string; namespace: string; api: string; args: SerializableType[] }

// Success response
{ id: string; result: SerializableType | void }

// Error response
{ id: string; error: { name, message, stack, i18nKey?, i18nArgs? } }
```

Message IDs are prefixed by origin: `main:N` (from main) or `worker:N` (from worker or renderer). IDs are used to match responses to pending promises.

---

## Type Constraints

All API arguments and return values must be `SerializableType` (defined in `src/bridge/Serializable.d.ts`):

```typescript
type SerializableType =
  | undefined
  | null
  | boolean
  | number
  | string
  | SerializableType[]
  | { [key: string]: SerializableType }
  | IAnyInterface; // escape hatch for interface types
```

**No Buffers, class instances, or functions** can cross the bridge. Binary data must be passed as `number[]`.

All bridge type definitions live in `src/bridge/*.d.ts` as type-only files.

---

## Broadcast APIs

A broadcast API is one where `broadcast: true` is passed to both `provideAPI` and `consumeAPI`. This changes the behavior:

- **Provider side**: Handler is still called, but no response is sent back to the caller.
- **Consumer side**: The call resolves immediately (fire-and-forget) without waiting for any response.
- **Forwarding still happens**: Main forwards the message to all other threads as usual, so all threads receive the broadcast.

Broadcast is used for notifications that go to all threads simultaneously: console output, events, locale changes. Because main forwards all messages unconditionally, a broadcast sent by any thread reaches every thread that has registered `provideAPI` for that namespace.

The same thread can both provide AND consume a broadcast API to handle its own local copy of the state plus receive messages from other threads.

---

## Patterns

### Pattern 1: Worker-Only API (most common)

The worker provides the implementation. Main and renderer consume it.

**`src/bridge/MyAPI.d.ts`** (type definition shared by all threads):

```typescript
export type IMyAPI = {
  doSomething: (path: string) => Promise<string>;
};
```

**`src/main/worker/MyAPI.ts`** (implementation in worker):

```typescript
import type { IMyAPI } from 'bridge/MyAPI';
import { provideAPI } from './IPC';

export async function initMyAPI(): Promise<void> {
  provideAPI('MyAPI', {
    doSomething: async (path: string): Promise<string> => {
      // ... heavy I/O here
      return result;
    },
  } as IMyAPI);
}
```

**`src/renderer/MyAPI.ts`** (consumed in renderer — mirrors the bridge/worker split):

```typescript
import type { IMyAPI } from 'bridge/MyAPI';
import { consumeAPI } from 'renderer/IPC';

const MyAPI = consumeAPI<IMyAPI>('MyAPI');

export default MyAPI;
```

Then import it wherever needed:

```typescript
import MyAPI from 'renderer/MyAPI';

// Inside a component or hook:
const result = await MyAPI.doSomething('/some/path');
```

Register in `src/main/worker/worker.ts`:

```typescript
import { initMyAPI } from './MyAPI';

// in start():
await initMyAPI();
```

---

### Pattern 2: Main-Only API

Main provides the implementation (requires Electron APIs). Worker and renderer consume it.

**`src/main/MyAPI.ts`** (implementation in main):

```typescript
import type { IMyAPI } from 'bridge/MyAPI';
import { provideAPI } from './IPC';

export async function initMyAPI(): Promise<void> {
  provideAPI('MyAPI', {
    doSomething: async (): Promise<string> => {
      return app.getPath('userData'); // Electron-only
    },
  } as IMyAPI);
}
```

**`src/main/worker/MyAPI.ts`** (consumed in worker, module-level):

```typescript
import type { IMyAPI } from 'bridge/MyAPI';
import { consumeAPI } from './IPC';

export const MyAPI = consumeAPI<IMyAPI>('MyAPI');

export async function initMyAPI(): Promise<void> {
  // Call at startup to cache values if needed
  const value = await MyAPI.doSomething();
  // ... store in module-level variable
}
```

Examples: `AppInfoAPI`, `ShellAPI`, `NxmProtocolAPI`, `UpdateInstallerAPI`.

---

### Pattern 3: Broadcast API (all threads participate)

Every thread both provides and consumes the same namespace with `broadcast: true`. When any thread calls the API, all threads receive the message and run their local handler.

```typescript
// In EACH thread (main, worker, renderer):

// Consumer: sends the broadcast (resolves immediately)
export const MyBroadcastAPI = consumeAPI<IMyAPI>('MyBroadcastAPI', {}, true);

// Provider: receives broadcasts from other threads
export async function initMyBroadcastAPI(): Promise<void> {
  provideAPI(
    'MyBroadcastAPI',
    {
      notify: async (value: string): Promise<void> => {
        // Handle the notification locally in this thread
      },
    } as IMyAPI,
    true,
  );
}
```

Examples: `ConsoleAPI` (log forwarding), `LocaleAPI` (locale sync), `EventAPI` (event bus).

---

### Pattern 4: Local Override (`localAPI` parameter)

When a method can be satisfied locally without an IPC round-trip, pass it as `localAPI`. Local methods take precedence over the proxy for that method name.

```typescript
export const MyAPI = consumeAPI<IMyAPI, Pick<IMyAPI, 'getLocal'>>(
  'MyAPI',
  {
    getLocal: () => localVariable, // handled here, no IPC
  },
  true, // broadcast for the non-local methods
);
```

The generic `TLocalAPI` type parameter documents which methods are local. This pattern appears in `LocaleAPI` (all threads can `getLocale()` locally) and `EventAPI` (`addListener`/`removeListener` manage local state only).

---

### Pattern 5: Renderer-Only API

Renderer provides; main (or worker via main) consumes. Used for lifecycle calls initiated by the main process toward the renderer.

**`src/renderer/IPC.ts`** already provides `RendererIPCAPI` (`disconnect`) — see that file for the canonical example.

---

## Error Propagation

When a provider throws, the error is serialized and re-thrown on the consumer side:

```typescript
// In provider:
throw new Error('Something failed');

// In consumer: the error is reconstructed with name/message/stack
try {
  await api.doSomething();
} catch (e) {
  // e.message === 'Something failed'
}
```

For localized errors in worker/main code, use `createI18nError` from `shared/i18n`. The `i18nKey` and `i18nArgs` fields are preserved through the IPC boundary. In renderer error display, use `te(error)` from `renderer/i18n` to translate them.

---

## Initialization Order

**Worker** (`src/main/worker/worker.ts`):

```
initIPC()          → sets up process.on('message') handler — must be first
initEventAPI()     → provides EventAPI (broadcast)
initConsoleAPI()   → provides ConsoleAPI (broadcast) — after this, console.log forwards
initAppInfoAPI()   → consumes AppInfoAPI from main (async, caches results)
initLocaleAPI()    → provides and consumes LocaleAPI (broadcast)
initAsar()         → needs appPath from AppInfoAPI
initQuickJS()      → loads WASM
initCascLib()      → loads native binding
initBridgeAPI()    → provides BridgeAPI (main worker API)
initUpdaterAPI()   → provides UpdaterAPI
initModUpdaterAPI()→ provides ModUpdaterAPI
```

`initIPC()` must be called first in every thread before any `provideAPI` or `consumeAPI` calls.

---

## Registered APIs by Thread

| Namespace            | Provided In              | Consumed In              | Broadcast |
| -------------------- | ------------------------ | ------------------------ | --------- |
| `BridgeAPI`          | Worker                   | Renderer                 | No        |
| `ModUpdaterAPI`      | Worker                   | Renderer                 | No        |
| `UpdaterAPI`         | Worker                   | Renderer                 | No        |
| `RequestAPI`         | Worker                   | — (internal)             | No        |
| `AppInfoAPI`         | Main                     | Worker, Renderer         | No        |
| `ShellAPI`           | Main                     | Renderer                 | No        |
| `NxmProtocolAPI`     | Main                     | Renderer                 | No        |
| `UpdateInstallerAPI` | Main                     | Renderer                 | No        |
| `ElectronUtilsAPI`   | Main                     | Renderer                 | No        |
| `ConsoleAPI`         | Main + Renderer          | Worker + Main + Renderer | Yes       |
| `EventAPI`           | Main + Renderer + Worker | Main + Renderer + Worker | Yes       |
| `LocaleAPI`          | Main + Renderer + Worker | Main + Renderer + Worker | Yes       |
| `RendererIPCAPI`     | Renderer                 | Main                     | No        |

---

## Common Mistakes to Avoid

**Don't call `consumeAPI` inside a React hook or component render.** Each API should have a dedicated `src/renderer/MyAPI.ts` file that calls `consumeAPI` at module scope and exports the result. Hooks and components import from that file.

```typescript
// CORRECT — src/renderer/MyAPI.ts
const MyAPI = consumeAPI<IMyAPI>('MyAPI');
export default MyAPI;

// CORRECT — hook imports from the API module
import MyAPI from 'renderer/MyAPI';
function useMyFeature() {
  const doThing = useCallback(async () => MyAPI.doSomething(), []);
  return { doThing };
}

// WRONG — consumeAPI called inside hook
function useMyFeature() {
  const api = consumeAPI<IMyAPI>('MyAPI'); // ← do not do this
  ...
}
```

**Don't forget `broadcast: true` on both sides.** If you provide with `broadcast: true` but consume without it (or vice versa), the behavior is undefined. Both must match.

**Don't pass non-serializable values across the bridge.** No `Buffer`, `Date`, class instances, functions, `Map`, `Set`, or `Symbol`. Use plain objects/arrays/primitives.

**Don't import from the wrong thread's IPC module.** Renderer code must import from `renderer/IPC`. Worker and main code import from their local `./IPC`. Using the wrong module will fail at runtime.

**Don't `provideAPI` after `consumeAPI` calls that depend on it.** Registration must happen before any message that targets the namespace can arrive. Follow the initialization order in `worker.ts`.
